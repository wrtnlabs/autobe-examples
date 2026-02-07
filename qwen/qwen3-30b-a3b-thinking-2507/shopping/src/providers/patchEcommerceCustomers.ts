import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceCustomerAtSummaryTransformer } from "../transformers/EcommerceCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomers(props: {
  body: IEcommerceCustomer.IRequest;
}): Promise<IPageIEcommerceCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 12;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput: Prisma.ecommerce_customersWhereInput = {
    deleted_at: null,
    ...(props.body.account_status === "inactive" && {
      deleted_at: { not: null },
    }),
    ...(props.body.registration_date_range && {
      created_at: {
        gte: props.body.registration_date_range.startDate,
        lte: props.body.registration_date_range.endDate,
      },
    }),
  } satisfies Prisma.ecommerce_customersWhereInput;
  // Get paginated data
  const data = await MyGlobal.prisma.ecommerce_customers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceCustomerAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_customers.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceCustomerAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } as IPage.IPagination,
  } as IPageIEcommerceCustomer.ISummary;
}
