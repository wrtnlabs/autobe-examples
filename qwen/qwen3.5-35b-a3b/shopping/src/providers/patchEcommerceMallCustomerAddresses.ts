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
import { EcommerceMallAddressAtSummaryTransformer } from "../transformers/EcommerceMallAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IEcommerceMallAddress.IRequest;
}): Promise<IPageIEcommerceMallAddress.ISummary> {
  const pageParam = props.body.page ?? "1";
  const limit = props.body.limit ?? 20;
  const search = props.body.search;
  const city = props.body.city;
  const state = props.body.state;
  const sort = props.body.sort ?? "created_at";
  const order = props.body.order ?? "desc";
  const page = parseInt(pageParam);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_addressesWhereInput = {
    ecommerce_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(search && {
      recipient_name: { contains: search, mode: "insensitive" },
    }),
    ...(city && { city: { startsWith: city } }),
    ...(state && { state: { startsWith: state } }),
  };
  const orderByInput = (
    sort === "recipient_name" || sort === "city" || sort === "created_at"
      ? { [sort]: order === "asc" ? "asc" : "desc" }
      : { created_at: order === "asc" ? "asc" : "desc" }
  ) satisfies Prisma.ecommerce_mall_addressesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_addresses.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...EcommerceMallAddressAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_addresses.count({
    where: whereInput,
  });
  const pages = Math.max(1, Math.ceil(total / limit));
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallAddressAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
