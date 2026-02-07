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
import { EcommerceAddressTransformer } from "../transformers/EcommerceAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IEcommerceAddress.IRequest;
}): Promise<IPageIEcommerceAddress.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    customer: { id: props.customer.id },
    ...(props.body.city && { city: { contains: props.body.city } }),
    ...(props.body.stateProvince && {
      state_province: { contains: props.body.stateProvince },
    }),
    ...(props.body.postalCode && {
      postal_code: { contains: props.body.postalCode },
    }),
    ...(props.body.country && { country: { contains: props.body.country } }),
  } satisfies Prisma.ecommerce_addressesWhereInput;
  const data = await MyGlobal.prisma.ecommerce_addresses.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceAddressTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_addresses.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(data, EcommerceAddressTransformer.transform),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
