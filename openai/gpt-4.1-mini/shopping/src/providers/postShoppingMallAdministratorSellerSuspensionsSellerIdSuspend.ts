import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSellerSuspensionCollector } from "../collectors/ShoppingMallSellerSuspensionCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorSellerSuspensionsSellerIdSuspend(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerSuspension.ICreate;
}): Promise<IShoppingMallSellerSuspension> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
    select: { id: true },
  });
  if (!seller) throw new HttpException("Seller not found", 404);
  // Explicitly extract suspension_reason and suspended_at as any to bypass missing properties in ICreate
  const suspension_reason = (props.body as any).suspension_reason;
  const suspended_at_str = (props.body as any).suspended_at;
  if (typeof suspension_reason !== "string") {
    throw new HttpException(
      "suspension_reason is required and must be string",
      400,
    );
  }
  if (typeof suspended_at_str !== "string") {
    throw new HttpException("suspended_at is required and must be string", 400);
  }
  const suspended_at_date = new Date(suspended_at_str);
  const createInput = await ShoppingMallSellerSuspensionCollector.collect({
    suspension_reason: suspension_reason,
    suspended_at: suspended_at_date,
    seller: { id: seller.id },
  });
  const created = await MyGlobal.prisma.shopping_mall_seller_suspensions.create(
    {
      data: createInput,
    },
  );
  return {
    id: created.id,
    seller_id: created.seller_id,
    suspension_reason: created.suspension_reason,
    suspended_at: toISOStringSafe(created.suspended_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
