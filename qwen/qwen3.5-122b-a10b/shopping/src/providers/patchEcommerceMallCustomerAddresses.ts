import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    ecommerce_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.recipient_name && {
      recipient_name: {
        contains: props.body.recipient_name,
      },
    }),
    ...(props.body.phone_number && {
      phone_number: {
        contains: props.body.phone_number,
      },
    }),
    ...(props.body.is_default !== undefined && {
      is_default: props.body.is_default,
    }),
    ...(props.body.search && {
      OR: [
        { recipient_name: { contains: props.body.search } },
        { phone_number: { contains: props.body.search } },
        { street_address: { contains: props.body.search } },
        { city: { contains: props.body.search } },
      ],
    }),
  } satisfies Prisma.ecommerce_mall_addressesWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_addresses.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceMallAddressAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_addresses.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallAddressAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallAddress.ISummary;
}
