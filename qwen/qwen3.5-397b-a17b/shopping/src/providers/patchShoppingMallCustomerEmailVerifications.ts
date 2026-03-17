import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerEmailVerification";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerEmailVerificationAtSummaryTransformer } from "../transformers/ShoppingMallCustomerEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerEmailVerifications(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerEmailVerification.IRequest;
}): Promise<IPageIShoppingMallCustomerEmailVerification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_customer_email_verificationsWhereInput =
    {
      shopping_mall_customer_id: props.customer.id,
      ...(props.body.verified !== undefined && {
        verified_at: props.body.verified ? { not: null } : { equals: null },
      }),
    } satisfies Prisma.shopping_mall_customer_email_verificationsWhereInput;
  const orderByInput = parseSort(props.body.sort);
  const data =
    await MyGlobal.prisma.shopping_mall_customer_email_verifications.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallCustomerEmailVerificationAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_customer_email_verifications.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCustomerEmailVerificationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
function parseSort(
  sort?: string,
): Prisma.shopping_mall_customer_email_verificationsOrderByWithRelationInput {
  if (!sort) {
    return { created_at: "desc" };
  }
  const [field, direction] = sort.split(",");
  const validFields: Array<
    keyof Prisma.shopping_mall_customer_email_verificationsOrderByWithRelationInput
  > = [
    "id",
    "shopping_mall_customer_id",
    "expires_at",
    "verified_at",
    "created_at",
    "updated_at",
  ];
  if (
    !validFields.includes(
      field as keyof Prisma.shopping_mall_customer_email_verificationsOrderByWithRelationInput,
    )
  ) {
    return { created_at: "desc" };
  }
  const validDirection = direction === "asc" ? "asc" : "desc";
  const orderByInput: Prisma.shopping_mall_customer_email_verificationsOrderByWithRelationInput =
    {};
  orderByInput[
    field as keyof Prisma.shopping_mall_customer_email_verificationsOrderByWithRelationInput
  ] = validDirection;
  return orderByInput;
}
