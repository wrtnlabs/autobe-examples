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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCustomerAddressAtSummaryTransformer } from "../transformers/ShoppingMallCustomerAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminCustomersCustomerIdAddresses(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerAddress.IRequest;
}): Promise<IPageIShoppingMallCustomerAddress.ISummary> {
  // Verify customer exists (404 if not)
  await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
    where: { id: props.customerId },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_customer_id: props.customerId,
    deleted_at: null,
    ...(props.body.search != null && {
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
    ...(props.body.isDefault != null && {
      is_default: props.body.isDefault,
    }),
  } satisfies Prisma.shopping_mall_customer_addressesWhereInput;
  const orderByInput:
    | Prisma.shopping_mall_customer_addressesOrderByWithRelationInput
    | Prisma.shopping_mall_customer_addressesOrderByWithRelationInput[] =
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : props.body.sort === "default_first"
        ? [{ is_default: "desc" }, { created_at: "desc" }]
        : { created_at: "desc" };
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
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCustomerAddressAtSummaryTransformer.transform,
    ),
  } satisfies IPageIShoppingMallCustomerAddress.ISummary;
}
