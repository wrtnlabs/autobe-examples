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
import { ShoppingMallCustomerPasswordResetAtSummaryTransformer } from "../transformers/ShoppingMallCustomerPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerPasswordResets(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerPasswordReset.IRequest;
}): Promise<IPageIShoppingMallCustomerPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const actorType = props.body.actorType;
  if (actorType && actorType !== "customer") {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  const whereInput: Prisma.shopping_mall_customer_password_resetsWhereInput = {
    ...(props.body.createdFrom && {
      created_at: { gte: new Date(props.body.createdFrom) },
    }),
    ...(props.body.createdTo && {
      created_at: { lte: new Date(props.body.createdTo) },
    }),
    ...(props.body.expiresFrom && {
      expires_at: { gte: new Date(props.body.expiresFrom) },
    }),
    ...(props.body.expiresTo && {
      expires_at: { lte: new Date(props.body.expiresTo) },
    }),
    ...(props.body.consumed !== undefined && {
      consumed_at: props.body.consumed ? { not: null } : { equals: null },
    }),
    ...(props.body.expired !== undefined && {
      expires_at: props.body.expired ? { lt: new Date() } : { gte: new Date() },
    }),
  };
  const orderByInput: Prisma.shopping_mall_customer_password_resetsOrderByWithRelationInput =
    (() => {
      if (!props.body.sort) {
        return { created_at: "desc" };
      }
      const [field, direction] = props.body.sort.split(",");
      const dir = direction === "asc" ? "asc" : "desc";
      if (field === "created_at") {
        return { created_at: dir };
      }
      if (field === "expires_at") {
        return { expires_at: dir };
      }
      return { created_at: "desc" };
    })();
  const data =
    await MyGlobal.prisma.shopping_mall_customer_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallCustomerPasswordResetAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_customer_password_resets.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCustomerPasswordResetAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
