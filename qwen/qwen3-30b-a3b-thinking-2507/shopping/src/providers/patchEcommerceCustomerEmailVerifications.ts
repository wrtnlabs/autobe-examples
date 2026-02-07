import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerEmailVerifications(props: {
  customer: CustomerPayload;
  body: IEcommerceCustomerEmailVerification.IRequest;
}): Promise<IPageIEcommerceCustomerEmailVerification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const currentIso = toISOStringSafe(new Date());
  const where = {
    customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.token && {
      token: {
        contains: props.body.token,
        mode: "insensitive" as "insensitive",
      },
      ...(props.body.isExpired !== undefined && {
        expires_at: props.body.isExpired
          ? { lte: currentIso }
          : { gt: currentIso },
      }),
    }),
  };
  const total =
    await MyGlobal.prisma.ecommerce_customer_email_verifications.count({
      where,
    });
  const records =
    await MyGlobal.prisma.ecommerce_customer_email_verifications.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        token: true,
        expires_at: true,
        confirmed_at: true,
        created_at: true,
        updated_at: true,
        customer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            phone: true,
            created_at: true,
          },
        },
      },
    });
  const transformedData = records.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    token: record.token,
    expires_at: toISOStringSafe(record.expires_at),
    confirmed_at: record.confirmed_at
      ? toISOStringSafe(record.confirmed_at)
      : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    customer: {
      id: (record.customer as any).id as string & tags.Format<"uuid">,
      email: (record.customer as any).email,
      display_name: (record.customer as any).display_name,
      phone: (record.customer as any).phone,
      created_at: toISOStringSafe((record.customer as any).created_at),
    },
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
