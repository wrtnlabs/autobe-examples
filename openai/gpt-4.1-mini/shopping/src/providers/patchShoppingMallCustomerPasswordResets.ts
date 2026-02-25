import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerPasswordReset";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
  const {
    token,
    shoppingCustomerId,
    createdAtStart,
    createdAtEnd,
    expiredAtStart,
    expiredAtEnd,
    deleted,
    page = 1,
    limit = 100,
    orderBy = "created_at",
    orderDirection = "desc",
  } = props.body;
  const whereClause: Prisma.shopping_mall_customer_password_resetsWhereInput = {
    ...(token ? { token: { contains: token } } : {}),
    ...(shoppingCustomerId ? { shopping_customer_id: shoppingCustomerId } : {}),
    ...(createdAtStart || createdAtEnd
      ? {
          created_at: {
            ...(createdAtStart ? { gte: new Date(createdAtStart) } : {}),
            ...(createdAtEnd ? { lte: new Date(createdAtEnd) } : {}),
          },
        }
      : {}),
    ...(expiredAtStart || expiredAtEnd
      ? {
          expired_at: {
            ...(expiredAtStart ? { gte: new Date(expiredAtStart) } : {}),
            ...(expiredAtEnd ? { lte: new Date(expiredAtEnd) } : {}),
          },
        }
      : {}),
    ...(typeof deleted === "boolean"
      ? deleted
        ? { deleted_at: { not: null } }
        : { deleted_at: null }
      : {}),
  };
  const skip = (page - 1) * limit;
  const orderByClause: Prisma.shopping_mall_customer_password_resetsOrderByWithRelationInput =
    orderBy && orderDirection
      ? { [orderBy]: orderDirection }
      : { created_at: "desc" };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customer_password_resets.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: orderByClause,
      select: {
        id: true,
        shopping_customer_id: true,
        expired_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            phone_number: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_customer_password_resets.count({
      where: whereClause,
    }),
  ]);
  const data = records.map((rec) => ({
    id: rec.id,
    shoppingCustomerId: rec.shopping_customer_id,
    expiredAt: rec.expired_at.toISOString(),
    createdAt: rec.created_at.toISOString(),
    updatedAt: rec.updated_at.toISOString(),
    deletedAt: rec.deleted_at ? rec.deleted_at.toISOString() : null,
    customer: {
      id: rec.customer.id,
      email: rec.customer.email,
      displayName: rec.customer.display_name ?? null,
      phoneNumber: rec.customer.phone_number ?? null,
      createdAt: rec.customer.created_at.toISOString(),
      updatedAt: rec.customer.updated_at.toISOString(),
    },
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
