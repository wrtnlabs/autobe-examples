import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerSuspensionTransformer } from "../transformers/EcommerceMallSellerSuspensionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminSellerSuspensions(props: {
  admin: AdminPayload;
  body: IEcommerceMallSellerSuspension.ICreate;
}): Promise<IEcommerceMallSellerSuspension> {
  // Validate seller exists and is not deleted
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.body.seller_id },
      select: { id: true, deleted_at: true },
    },
  );
  if (seller.deleted_at !== null) {
    throw new HttpException("Seller does not exist or is deleted", 404);
  }
  // Check seller is not already suspended (active suspension = NULL restored_at)
  const existingSuspension =
    await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findFirst({
      where: {
        ecommerce_mall_seller_id: props.body.seller_id,
        restored_at: null,
      },
      select: { id: true },
    });
  if (existingSuspension !== null) {
    throw new HttpException("Seller is already suspended", 409);
  }
  // Create suspension record using collector
  const created =
    await MyGlobal.prisma.ecommerce_mall_seller_suspensions.create({
      data: {
        id: v4(),
        ecommerce_mall_seller_id: props.body.seller_id,
        suspended_by_id: props.admin.id,
        reason: props.body.reason,
        restored_reason: null,
        suspended_at: new Date(),
        restored_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      ...EcommerceMallSellerSuspensionTransformer.select(),
    });
  return await EcommerceMallSellerSuspensionTransformer.transform(created);
}
