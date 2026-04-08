import { IEcommerceCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomerEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCustomerEmailVerificationAtSummaryTransformer } from "../transformers/EcommerceCustomerEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerEmailVerifications(props: {
  customer: CustomerPayload;
  body: IEcommerceCustomerEmailVerification.IRequest;
}): Promise<IPageIEcommerceCustomerEmailVerification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    ecommerce_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.email && {
      customer: {
        email: {
          contains: props.body.email,
          mode: "insensitive",
        },
      },
    }),
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
  } satisfies Prisma.ecommerce_customer_email_verificationsWhereInput;
  const allRecords =
    await MyGlobal.prisma.ecommerce_customer_email_verifications.findMany({
      where: whereInput,
      orderBy: { created_at: "desc" },
      ...EcommerceCustomerEmailVerificationAtSummaryTransformer.select(),
    });
  const now = new Date();
  const filteredRecords = props.body.status
    ? allRecords.filter((record) => {
        const isVerified = record.verified_at !== null;
        const isExpired = !isVerified && record.expires_at < now;
        const status = isVerified
          ? "verified"
          : isExpired
            ? "expired"
            : "pending";
        return status === props.body.status;
      })
    : allRecords;
  const total = filteredRecords.length;
  const paginatedRecords = filteredRecords.slice(skip, skip + limit);
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data: await ArrayUtil.asyncMap(
      paginatedRecords,
      EcommerceCustomerEmailVerificationAtSummaryTransformer.transform,
    ),
  };
}
