import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerEmailVerification";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
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

export async function patchShoppingMallCustomerEmailVerifications(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerEmailVerification.IRequest;
}): Promise<IPageIShoppingMallCustomerEmailVerification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const where = {
    AND: [
      { deleted_at: null },
      props.body.token ? { token: { contains: props.body.token } } : {},
      props.body.expiresAtBefore
        ? { expires_at: { lte: props.body.expiresAtBefore } }
        : {},
      props.body.expiresAtAfter
        ? { expires_at: { gte: props.body.expiresAtAfter } }
        : {},
      props.body.verified !== undefined
        ? props.body.verified
          ? { verified_at: { not: null } }
          : { verified_at: null }
        : {},
      props.body.shoppingMallCustomerId
        ? { shopping_mall_customer_id: props.body.shoppingMallCustomerId }
        : {},
    ],
  };
  const data =
    await MyGlobal.prisma.shopping_mall_customer_email_verifications.findMany({
      where,
      skip,
      take: limit,
      orderBy: { expires_at: "asc" },
      select: {
        id: true,
        token: true,
        expires_at: true,
        verified_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            phone_number: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_customer_email_verifications.count({
      where,
    });
  function toSummary(
    record: (typeof data)[number],
  ): IShoppingMallCustomerEmailVerification.ISummary {
    return {
      id: record.id,
      token: record.token,
      expiresAt: record.expires_at.toISOString() as unknown as string &
        tags.Format<"date-time">,
      verifiedAt: record.verified_at?.toISOString() ?? null,
      createdAt: record.created_at.toISOString() as unknown as string &
        tags.Format<"date-time">,
      updatedAt: record.updated_at.toISOString() as unknown as string &
        tags.Format<"date-time">,
      deletedAt: record.deleted_at?.toISOString() ?? null,
      customer: {
        id: record.customer.id,
        email: record.customer.email,
        displayName: record.customer.display_name ?? null,
        phoneNumber: record.customer.phone_number ?? null,
        createdAt:
          record.customer.created_at.toISOString() as unknown as string &
            tags.Format<"date-time">,
        updatedAt:
          record.customer.updated_at.toISOString() as unknown as string &
            tags.Format<"date-time">,
      },
    };
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map(toSummary),
  };
}
