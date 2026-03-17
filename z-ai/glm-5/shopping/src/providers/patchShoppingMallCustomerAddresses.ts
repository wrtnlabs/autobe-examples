import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddress";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallAddressAtSummaryTransformer } from "../transformers/ShoppingMallAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IShoppingMallAddress.IRequest;
}): Promise<IPageIShoppingMallAddress.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.city !== undefined && {
      city: { contains: props.body.city, mode: "insensitive" as const },
    }),
    ...(props.body.stateProvince !== undefined && {
      state_province: {
        contains: props.body.stateProvince,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.country !== undefined && {
      country: { contains: props.body.country, mode: "insensitive" as const },
    }),
    ...(props.body.isDefault !== undefined && {
      is_default: props.body.isDefault,
    }),
  } satisfies Prisma.shopping_mall_addressesWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_addresses.findMany({
      where: whereInput,
      ...ShoppingMallAddressAtSummaryTransformer.select(),
      skip,
      take: limit,
      orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
    }),
    MyGlobal.prisma.shopping_mall_addresses.count({ where: whereInput }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallAddressAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
