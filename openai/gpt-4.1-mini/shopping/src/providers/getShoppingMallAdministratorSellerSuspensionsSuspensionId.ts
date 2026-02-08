import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorSellerSuspensionsSuspensionId(props: {
  administrator: AdministratorPayload;
  suspensionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerSuspension> {
  const record =
    await MyGlobal.prisma.shopping_mall_seller_suspensions.findUnique({
      where: { id: props.suspensionId },
    });
  if (record === null) {
    throw new HttpException("Seller suspension not found", 404);
  }
  /**
   * Convert each field of record to strictly typed format without using as assertions.
   * The UUID fields are retrieved as strings from the database and match required format,
   * so they can be assigned directly to the return object.
   * Dates are converted to string & tags.Format<'date-time'> via toISOStringSafe.
   * Nullable deleted_at is handled with null or converted string.
   */
  const id: string & tags.Format<"uuid"> = record.id;
  const seller_id: string & tags.Format<"uuid"> = record.seller_id;
  const suspension_reason: string = record.suspension_reason;
  const suspended_at: string & tags.Format<"date-time"> = toISOStringSafe(
    record.suspended_at,
  );
  const created_at: string & tags.Format<"date-time"> = toISOStringSafe(
    record.created_at,
  );
  const updated_at: string & tags.Format<"date-time"> = toISOStringSafe(
    record.updated_at,
  );
  const deleted_at: (string & tags.Format<"date-time">) | null =
    record.deleted_at === null ? null : toISOStringSafe(record.deleted_at);
  return {
    id,
    seller_id,
    suspension_reason,
    suspended_at,
    created_at,
    updated_at,
    deleted_at,
  };
}
