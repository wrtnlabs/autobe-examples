import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallUserBanTransformer } from "../transformers/EcommerceMallUserBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminUserBans(props: {
  admin: AdminPayload;
  body: IEcommerceMallUserBan.ICreate;
}): Promise<IEcommerceMallUserBan> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const target = await MyGlobal.prisma.$transaction(async (tx) => {
    const [customer, seller] = await Promise.all([
      props.body.user_type === "customer"
        ? tx.ecommerce_mall_customers.findUnique({
            where: { id: props.body.user_id },
            select: { id: true, sessions: true },
          })
        : null,
      props.body.user_type === "seller"
        ? tx.ecommerce_mall_sellers.findUnique({
            where: { id: props.body.user_id },
            select: { id: true },
          })
        : null,
    ]);
    if (!customer && !seller) {
      throw new HttpException("Target user not found", 404);
    }
    const existingBan = await tx.ecommerce_mall_user_bans.findFirst({
      where: { user_id: props.body.user_id, is_active: true },
    });
    if (existingBan) {
      throw new HttpException("User is already banned", 409);
    }
    const suspendedSeller =
      await tx.ecommerce_mall_seller_suspensions.findUnique({
        where: { id: props.body.user_id },
      });
    if (suspendedSeller) {
      throw new HttpException("Seller is already suspended", 409);
    }
    const createdBan = await tx.ecommerce_mall_user_bans.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        user_id: props.body.user_id,
        admin_id: props.admin.id,
        seller_registration_id:
          props.body.user_type === "seller" ? undefined : null,
        user_type: props.body.user_type,
        reason: props.body.reason,
        banned_at: now,
        unban_at: props.body.unban_at ?? null,
        is_active: true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      select: EcommerceMallUserBanTransformer.select().select,
    });
    if (props.body.user_type === "customer" && customer) {
      await tx.ecommerce_mall_customer_sessions.updateMany({
        where: { customer: { id: props.body.user_id } },
        data: {},
      });
    }
    if (props.body.user_type === "seller" && seller) {
      await tx.ecommerce_mall_seller_sessions.updateMany({
        where: { seller: { id: props.body.user_id } },
        data: {},
      });
    }
    return createdBan;
  });
  return await EcommerceMallUserBanTransformer.transform(target);
}
