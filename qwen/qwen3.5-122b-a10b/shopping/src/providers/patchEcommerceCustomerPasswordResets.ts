import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCustomerPasswordResetAtSummaryTransformer } from "../transformers/EcommerceCustomerPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerPasswordResets(props: {
  customer: CustomerPayload;
  body: IEcommerceCustomerPasswordReset.IRequest;
}): Promise<IPageIEcommerceCustomerPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_customer_password_resetsWhereInput = {
    deleted_at: null,
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
    ...(props.body.expires_at_from && {
      expires_at: {
        gte: new Date(props.body.expires_at_from),
      },
    }),
    ...(props.body.expires_at_to && {
      expires_at: {
        lte: new Date(props.body.expires_at_to),
      },
    }),
    ...(props.body.is_used !== undefined && {
      used_at: props.body.is_used ? { not: null } : null,
    }),
  };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_customer_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceCustomerPasswordResetAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_customer_password_resets.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceCustomerPasswordResetAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceCustomerPasswordReset.ISummary;
}
