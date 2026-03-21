import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShippingAddressAtSummaryTransformer } from "../transformers/EcommerceMallShippingAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerCustomersAddresses(props: {
  customer: CustomerPayload;
  body: IEcommerceMallShippingAddress.IRequest;
}): Promise<IPageIEcommerceMallShippingAddress.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  const whereInput = {
    ecommerce_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.search !== undefined && {
      recipient_name: { contains: props.body.search },
    }),
    ...(props.body.recipient_name !== undefined && {
      recipient_name: props.body.recipient_name,
    }),
    ...(props.body.phone !== undefined && {
      phone: props.body.phone,
    }),
    ...(props.body.city !== undefined && {
      city: props.body.city,
    }),
    ...(props.body.state !== undefined && {
      state: props.body.state,
    }),
    ...(props.body.postal_code !== undefined && {
      postal_code: props.body.postal_code,
    }),
    ...(props.body.country !== undefined && {
      country: props.body.country,
    }),
    ...(props.body.is_default !== undefined && {
      is_default: props.body.is_default,
    }),
  } satisfies Prisma.ecommerce_mall_shipping_addressesWhereInput;
  const orderByInput = {
    [sortField]: sortOrder,
  } satisfies Prisma.ecommerce_mall_shipping_addressesOrderByWithRelationInput;
  const addresses =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallShippingAddressAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_shipping_addresses.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      addresses,
      EcommerceMallShippingAddressAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallShippingAddress.ISummary;
}
