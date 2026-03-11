import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerEmailVerification";
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

export async function patchEcommerceMallCustomerEmailVerifications(props: {
  customer: CustomerPayload;
  body: IEcommerceMallSellerEmailVerification.IRequest;
}): Promise<IPageIEcommerceMallSellerEmailVerification.ISummary> {
  const page = Math.max(
    1,
    Math.floor(parseInt(props.body.page ?? "1")),
  ) satisfies number & tags.Type<"int32">;
  const limit = Math.max(
    1,
    Math.min(
      100,
      parseInt((props.body.limit ?? "100") as string),
    ) satisfies number & tags.Type<"int32">,
  ) satisfies number & tags.Type<"int32">;
  const skip = (page - 1) * limit;
  const now = new Date();
  const customer =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id },
      select: {
        email: true,
        created_at: true,
        updated_at: true,
      },
    });
  const whereInput: Prisma.ecommerce_mall_customer_email_verificationsWhereInput =
    {
      deleted_at: null,
      customer_id: props.customer.id,
      ...(props.body.status
        ? { status: props.body.status as "pending" | "used" | "expired" }
        : {}),
      ...(props.body.email ? { email: props.body.email } : {}),
      ...(props.body.created_after
        ? { created_at: { gte: new Date(props.body.created_after) } }
        : {}),
      ...(props.body.created_before
        ? { created_at: { lte: new Date(props.body.created_before) } }
        : {}),
      ...(props.body.expires_before
        ? { expires_at: { lt: new Date(props.body.expires_before) } }
        : {}),
      ...(props.body.used_after !== null && props.body.used_after
        ? {
            used_at: {
              gte: new Date(props.body.used_after),
            },
          }
        : {}),
      ...(props.body.used_before !== null && props.body.used_before
        ? {
            used_at: {
              lte: new Date(props.body.used_before),
            },
          }
        : {}),
    };
  const orderByInput = (
    props.body.sort_by
      ? {
          [props.body.sort_by]:
            props.body.sort_order === "ASC" ? "asc" : "desc",
        }
      : {
          created_at: "desc",
        }
  ) satisfies Prisma.ecommerce_mall_customer_email_verificationsOrderByWithRelationInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_customer_email_verifications.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.ecommerce_mall_customer_email_verifications.count({
      where: whereInput,
    }),
  ]);
  const transformResult = records.map((record) => {
    const status: "pending" | "used" | "expired" =
      record.used_at === null
        ? "pending"
        : record.expires_at > now && record.used_at !== null
          ? "used"
          : "expired";
    const seller: IEcommerceMallSeller.ISummary = {
      id: props.customer.id as string & tags.Format<"uuid">,
      email: customer.email as string & tags.Format<"email">,
      approvalStatus: "pending" as "pending" | "approved" | "rejected",
      rejectionReason: null,
      isSuspended: false,
      isBanned: false,
      createdAt: toISOStringSafe(customer.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(customer.updated_at) as string &
        tags.Format<"date-time">,
    };
    const result: IEcommerceMallSellerEmailVerification.ISummary = {
      id: record.id as string & tags.Format<"uuid">,
      seller,
      expiresAt: toISOStringSafe(record.expires_at) as string &
        tags.Format<"date-time">,
      usedAt:
        record.used_at !== null
          ? (toISOStringSafe(record.used_at) as string &
              tags.Format<"date-time">)
          : null,
      createdAt: toISOStringSafe(record.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(record.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt:
        record.deleted_at !== null
          ? (toISOStringSafe(record.deleted_at) as string &
              tags.Format<"date-time">)
          : null,
      status,
    };
    return result;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformResult,
  };
}
