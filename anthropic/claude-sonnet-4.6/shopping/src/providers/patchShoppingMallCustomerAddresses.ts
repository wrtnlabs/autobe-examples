import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerAddressAtSummaryTransformer } from "../transformers/ShoppingMallCustomerAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerAddress.IRequest;
}): Promise<IPageIShoppingMallCustomerAddress.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.isDefault !== null &&
      props.body.isDefault !== undefined && {
        is_default: props.body.isDefault,
      }),
    ...(props.body.search !== null &&
      props.body.search !== undefined && {
        OR: [
          {
            recipient_name: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          {
            address_line1: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
  } satisfies Prisma.shopping_mall_customer_addressesWhereInput;
  const orderByInput: Prisma.shopping_mall_customer_addressesOrderByWithRelationInput[] =
    props.body.sort === "oldest"
      ? [{ created_at: "asc" as const }]
      : props.body.sort === "default_first"
        ? [{ is_default: "desc" as const }, { created_at: "desc" as const }]
        : [{ created_at: "desc" as const }];
  const data = await MyGlobal.prisma.shopping_mall_customer_addresses.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...ShoppingMallCustomerAddressAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_customer_addresses.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCustomerAddressAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
