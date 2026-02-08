import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerPasswordReset";
import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerPasswordResets(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerPasswordReset.IRequest;
}): Promise<IPageIShoppingMallCustomerPasswordReset.ISummary> {
  // Pagination parameters not present on IRequest, fix defaults
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const where = {
    deleted_at: null,
  };
  const records =
    await MyGlobal.prisma.shopping_mall_customer_password_resets.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_customer_password_resets.count({
      where,
    });
  return {
    data: records.map((record) => ({
      id: record.id,
      customer_id: record.shopping_customer_id,
      token: record.token,
      expires_at: toISOStringSafe(record.expired_at),
      used_at: null,
      created_at: toISOStringSafe(record.created_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
