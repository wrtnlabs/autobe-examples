import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminProductApprovalsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductApproval> {
  const { id } = props;

  const record =
    await MyGlobal.prisma.shopping_mall_product_approvals.findUniqueOrThrow({
      where: {
        id,
      },
    });

  return {
    id: record.id,
    shopping_mall_product_id: record.shopping_mall_product_id,
    shopping_mall_admin_id: record.shopping_mall_admin_id,
    status: record.status,
    reason: record.reason ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
