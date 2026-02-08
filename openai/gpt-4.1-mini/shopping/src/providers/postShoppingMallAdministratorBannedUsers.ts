import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBannedUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallBannedUserCollector } from "../collectors/ShoppingMallBannedUserCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorBannedUsers(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallBannedUser.ICreate;
}): Promise<IShoppingMallBannedUser> {
  const { body } = props;
  const customerId = (body as any).shoppingMallCustomerId as
    | (string & import("typia").tags.Format<"uuid">)
    | undefined;

  const sellerId = (body as any).shoppingMallSellerId as
    | (string & import("typia").tags.Format<"uuid">)
    | undefined;

  const banReason = (body as any).banReason as string | undefined;
  if ((customerId && sellerId) || (!customerId && !sellerId)) {
    throw new HttpException(
      "Provide exactly one of shoppingMallCustomerId or shoppingMallSellerId",
      400,
    );
  }
  if (!banReason || banReason.trim().length === 0) {
    throw new HttpException("banReason is required", 400);
  }
  if (customerId) {
    const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw new HttpException("Customer not found", 404);
  }
  if (sellerId) {
    const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: sellerId },
    });
    if (!seller) throw new HttpException("Seller not found", 404);
  }
  const collectedData = await ShoppingMallBannedUserCollector.collect({ body });
  const createData = {
    ...collectedData,
    ban_reason: banReason,
    created_at: toISOStringSafe(new Date()),
    updated_at: toISOStringSafe(new Date()),
    deleted_at: null,
    customer: customerId ? { connect: { id: customerId } } : undefined,
    seller: sellerId ? { connect: { id: sellerId } } : undefined,
  };
  const created = await MyGlobal.prisma.shopping_mall_banned_users.create({
    data: createData,
  });
  return {
    id: created.id as string & import("typia").tags.Format<"uuid">,
    shopping_mall_customer_id: created.shopping_mall_customer_id ?? undefined,
    shopping_mall_seller_id: created.shopping_mall_seller_id ?? undefined,
    ban_reason: created.ban_reason,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
