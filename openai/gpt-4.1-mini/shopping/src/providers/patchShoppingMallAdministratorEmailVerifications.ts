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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorEmailVerifications(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallCustomerEmailVerification.IRequest;
}): Promise<IPageIShoppingMallCustomerEmailVerification.ISummary> {
  const page = Math.max(props.body.page ?? 1, 1);
  const limit = Math.min(Math.max(props.body.limit ?? 50, 1), 100);
  const skip = (page - 1) * limit;
  const customerWhere: Prisma.shopping_mall_customer_email_verificationsWhereInput & {
    AND: Prisma.shopping_mall_customer_email_verificationsWhereInput[];
  } = { AND: [] };
  if (props.body.token)
    customerWhere.AND.push({ token: { contains: props.body.token } });
  if (props.body.expiresAtBefore)
    customerWhere.AND.push({ expires_at: { lte: props.body.expiresAtBefore } });
  if (props.body.expiresAtAfter)
    customerWhere.AND.push({ expires_at: { gte: props.body.expiresAtAfter } });
  if (props.body.verified !== undefined) {
    if (props.body.verified)
      customerWhere.AND.push({ verified_at: { not: null } });
    else customerWhere.AND.push({ verified_at: null });
  }
  if (props.body.shoppingMallCustomerId)
    customerWhere.AND.push({
      shopping_mall_customer_id: props.body.shoppingMallCustomerId,
    });
  const sellerWhere: Prisma.shopping_mall_seller_email_verificationsWhereInput & {
    AND: Prisma.shopping_mall_seller_email_verificationsWhereInput[];
  } = { AND: [] };
  if (props.body.token)
    sellerWhere.AND.push({ token: { contains: props.body.token } });
  if (props.body.expiresAtBefore)
    sellerWhere.AND.push({ expired_at: { lte: props.body.expiresAtBefore } });
  if (props.body.expiresAtAfter)
    sellerWhere.AND.push({ expired_at: { gte: props.body.expiresAtAfter } });
  const customerCount =
    await MyGlobal.prisma.shopping_mall_customer_email_verifications.count({
      where: customerWhere,
    });
  const sellerCount =
    await MyGlobal.prisma.shopping_mall_seller_email_verifications.count({
      where: sellerWhere,
    });
  const customerRecords =
    await MyGlobal.prisma.shopping_mall_customer_email_verifications.findMany({
      where: customerWhere,
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
  const sellerRecords =
    await MyGlobal.prisma.shopping_mall_seller_email_verifications.findMany({
      where: sellerWhere,
      skip: Math.max(0, skip - customerCount),
      take: Math.max(0, limit - customerRecords.length),
      orderBy: { expired_at: "asc" },
      select: {
        id: true,
        token: true,
        expired_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller_id: true,
      },
    });
  type CustomerRecord = (typeof customerRecords)[number] & {
    type: "customer";
  };
  type SellerRecord = Omit<(typeof sellerRecords)[number], "expired_at"> & {
    expires_at: Date;
    type: "seller";
  };
  const combinedRecords: (CustomerRecord | SellerRecord)[] = [
    ...customerRecords.map((r) => ({ ...r, type: "customer" })),
    ...sellerRecords.map((r) => ({
      ...r,
      type: "seller",
      expires_at: r.expired_at,
    })),
  ];
  combinedRecords.sort((a, b) =>
    a.expires_at < b.expires_at ? -1 : a.expires_at > b.expires_at ? 1 : 0,
  );
  const data: IShoppingMallCustomerEmailVerification.ISummary[] =
    combinedRecords.map((record) => {
      if (record.type === "customer") {
        return {
          id: record.id,
          token: record.token,
          expiresAt: toISOStringSafe(record.expires_at),
          verifiedAt:
            record.verified_at != null
              ? toISOStringSafe(record.verified_at)
              : null,
          createdAt: toISOStringSafe(record.created_at),
          updatedAt: toISOStringSafe(record.updated_at),
          deletedAt:
            record.deleted_at != null
              ? toISOStringSafe(record.deleted_at)
              : null,
          customer: {
            id: record.customer.id,
            email: record.customer.email,
            displayName: record.customer.display_name ?? null,
            phoneNumber: record.customer.phone_number ?? null,
            createdAt: toISOStringSafe(record.customer.created_at),
            updatedAt: toISOStringSafe(record.customer.updated_at),
          },
        };
      } else {
        return {
          id: record.id,
          token: record.token,
          expiresAt: toISOStringSafe(record.expires_at),
          verifiedAt: null,
          createdAt: toISOStringSafe(record.created_at),
          updatedAt: toISOStringSafe(record.updated_at),
          deletedAt:
            record.deleted_at != null
              ? toISOStringSafe(record.deleted_at)
              : null,
          customer: {
            id: record.seller_id,
            email: "deleted@seller.invalid",
            displayName: null,
            phoneNumber: null,
            createdAt: "1970-01-01T00:00:00.000Z" as string &
              tags.Format<"date-time">,
            updatedAt: "1970-01-01T00:00:00.000Z" as string &
              tags.Format<"date-time">,
          },
        };
      }
    });
  return {
    pagination: {
      current: page,
      limit,
      records: customerCount + sellerCount,
      pages: Math.ceil((customerCount + sellerCount) / limit),
    },
    data,
  };
}
