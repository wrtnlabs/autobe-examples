import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAddress";
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

export async function patchEcommerceMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IEcommerceMallAddress.IRequest;
}): Promise<IPageIEcommerceMallAddress.ISummary> {
  const page = Number(props.body.page ?? 1) satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = Number(props.body.limit ?? 20) satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const skip = (page - 1) * limit;
  const sortOrder = props.body.order === "asc" ? "asc" : "desc";
  const sortField = props.body.sort ?? "created_at";
  const whereInput: Prisma.ecommerce_mall_addressesWhereInput = {
    ecommerce_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.search !== undefined
      ? {
          recipient_name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.city !== undefined
      ? {
          city: {
            startsWith: props.body.city,
          },
        }
      : {}),
    ...(props.body.state !== undefined
      ? {
          state: {
            startsWith: props.body.state,
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_addressesWhereInput;
  const orderByInput: Prisma.ecommerce_mall_addressesOrderByWithRelationInput[] =
    [
      { [sortField]: sortOrder },
    ] satisfies Prisma.ecommerce_mall_addressesOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.ecommerce_mall_addresses.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
  });
  const total = await MyGlobal.prisma.ecommerce_mall_addresses.count({
    where: whereInput,
  });
  return {
    data: data.map((item) => ({
      id: item.id,
      ecommerce_mall_customer_id: item.ecommerce_mall_customer_id,
      recipient_name: item.recipient_name,
      recipient_phone: item.recipient_phone,
      street: item.street,
      state: item.state,
      city: item.city,
      is_default: item.is_default,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at:
        item.deleted_at != null ? toISOStringSafe(item.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
