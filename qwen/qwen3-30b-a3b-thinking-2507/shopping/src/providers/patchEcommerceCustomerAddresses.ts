import { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomerAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCustomerAddressAtSummaryTransformer } from "../transformers/EcommerceCustomerAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IEcommerceCustomerAddress.IRequest;
}): Promise<IPageIEcommerceCustomerAddress.ISummary> {
  const {
    page: _page = props.body.page ?? 1,
    limit: _limit = props.body.limit ?? 100,
  } = props.body;
  const page = _page satisfies number as number;
  const limit = _limit satisfies number as number;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_customer_addressesWhereInput = {
    customer: { id: props.customer.id },
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { city: { contains: props.body.search, mode: "insensitive" } },
        { state: { contains: props.body.search, mode: "insensitive" } },
        { postal_code: { contains: props.body.search, mode: "insensitive" } },
        { country: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.city && {
      city: { contains: props.body.city, mode: "insensitive" },
    }),
    ...(props.body.state && {
      state: { contains: props.body.state, mode: "insensitive" },
    }),
    ...(props.body.postal_code && {
      postal_code: { contains: props.body.postal_code, mode: "insensitive" },
    }),
    ...(props.body.country && {
      country: { contains: props.body.country, mode: "insensitive" },
    }),
  };
  const total = await MyGlobal.prisma.ecommerce_customer_addresses.count({
    where,
  });
  const data = await MyGlobal.prisma.ecommerce_customer_addresses.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" }],
    ...EcommerceCustomerAddressAtSummaryTransformer.select(),
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceCustomerAddressAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
