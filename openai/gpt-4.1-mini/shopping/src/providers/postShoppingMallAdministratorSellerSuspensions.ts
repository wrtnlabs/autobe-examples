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

export async function postShoppingMallAdministratorSellerSuspensions(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSellerSuspension.ICreate;
}): Promise<IShoppingMallSellerSuspension> {
  const prisma = MyGlobal.prisma;
  // Expect props.body to have seller_id, suspension_reason, suspended_at explicitly
  // Since ICreate is empty, we rely on actual payload containing these fields without typing enforcement
  const seller_id = (props.body as any).seller_id as string &
    tags.Format<"uuid">;
  const suspension_reason = (props.body as any).suspension_reason as string;
  const suspended_at_str = (props.body as any).suspended_at as string &
    tags.Format<"date-time">;
  // Validate seller exist and active
  const seller = await prisma.shopping_mall_sellers.findUnique({
    where: { id: seller_id },
    select: { id: true, deleted_at: true },
  });
  if (!seller || seller.deleted_at !== null) {
    throw new HttpException("Seller not found or inactive", 404);
  }
  // Check no active suspension at present
  const activeSuspension =
    await prisma.shopping_mall_seller_suspensions.findFirst({
      where: { seller_id: seller_id, deleted_at: null },
    });
  if (activeSuspension) {
    throw new HttpException(
      "Active suspension already exists for this seller",
      409,
    );
  }
  // Use collector manually adapted
  const createInput = await ShoppingMallSellerSuspensionCollector.collect({
    suspension_reason: suspension_reason,
    suspended_at: new Date(suspended_at_str),
    seller: { id: seller_id },
  });
  const created = await prisma.shopping_mall_seller_suspensions.create({
    data: createInput,
  });
  return {
    id: created.id,
    seller_id: created.seller_id,
    suspension_reason: created.suspension_reason,
    suspended_at: toISOStringSafe(created.suspended_at) as string &
      tags.Format<"date-time">,
    created_at: toISOStringSafe(created.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(created.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: created.deleted_at
      ? (toISOStringSafe(created.deleted_at) as string &
          tags.Format<"date-time">)
      : null,
  };
}
