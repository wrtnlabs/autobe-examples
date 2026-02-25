import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerExports } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerExports";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminSellersSellerIdExports(props: {
  admin: AdminPayload;
  sellerId: string;
  body: IShoppingMallSellerExports.IRequest;
}): Promise<IShoppingMallSellerExports> {
  const exportRecord =
    await MyGlobal.prisma.shopping_mall_seller_exports.findFirstOrThrow({
      where: {
        shopping_mall_seller_id: props.sellerId,
        status: { in: ["pending", "processing"] },
      },
    });
  const now = new Date();
  const startedAt =
    exportRecord.status === "pending" && props.body.status === "processing"
      ? toISOStringSafe(now)
      : (exportRecord.started_at?.toISOString() ?? null);
  const completedAt =
    props.body.status === "completed"
      ? toISOStringSafe(now)
      : (exportRecord.completed_at?.toISOString() ?? null);
  const failedAt =
    props.body.status === "failed"
      ? toISOStringSafe(now)
      : (exportRecord.failed_at?.toISOString() ?? null);
  const updated = await MyGlobal.prisma.shopping_mall_seller_exports.update({
    where: { id: exportRecord.id },
    data: {
      status: props.body.status,
      file_url: props.body.file_url ?? null,
      error_message: props.body.error_message ?? null,
      shopping_mall_admin_id: props.admin.id,
      started_at: startedAt,
      completed_at: completedAt,
      failed_at: failedAt,
    },
  });
  const transformed: IShoppingMallSellerExports = {
    id: updated.id,
    shoppingMallSellerId: updated.shopping_mall_seller_id,
    shoppingMallAdminId: props.admin.id,
    format: updated.format,
    scope: updated.scope,
    status: updated.status,
    fileUrl: updated.file_url ?? undefined,
    errorMessage: updated.error_message ?? undefined,
    requestedAt: updated.requested_at.toISOString(),
    startedAt: startedAt ?? undefined,
    completedAt: completedAt ?? undefined,
    failedAt: failedAt ?? undefined,
  };
  return typia.assert<IShoppingMallSellerExports>(transformed);
}
