import { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceAddressAtSummaryTransformer } from "../transformers/EcommerceAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IEcommerceAddress.IRequest;
}): Promise<IPageIEcommerceAddress.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_addressesWhereInput = {
    ecommerce_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.search !== undefined && {
      OR: [
        {
          recipient_name: { contains: props.body.search, mode: "insensitive" },
        },
        {
          street_address: { contains: props.body.search, mode: "insensitive" },
        },
        { city: { contains: props.body.search, mode: "insensitive" } },
        { country: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.is_default !== undefined && {
      is_default: props.body.is_default,
    }),
    ...(props.body.city !== undefined && {
      city: props.body.city,
    }),
    ...(props.body.country !== undefined && {
      country: props.body.country,
    }),
  };
  const orderByField = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const orderByInput: Prisma.ecommerce_addressesOrderByWithRelationInput =
    orderByField === "recipient_name"
      ? { recipient_name: sortOrder }
      : orderByField === "updated_at"
        ? { updated_at: sortOrder }
        : { created_at: sortOrder };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_addresses.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceAddressAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_addresses.count({
      where: whereInput,
    }),
  ]);
  const pages = Math.ceil(total / limit);
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: pages,
  };
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceAddressAtSummaryTransformer.transform,
  );
  const result: IPageIEcommerceAddress.ISummary = {
    pagination: pagination,
    data: data,
  };
  return result;
}
