import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerEmailVerification";
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
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query for customer verifications
  const customerVerifications =
    await MyGlobal.prisma.shopping_mall_customer_email_verifications.findMany({
      where: {
        deleted_at: null,
        shopping_mall_customer_id: { not: null }, // This should be properly typed as UUID
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        created_at: true,
        expires_at: true,
        updated_at: true,
        deleted_at: true,
        shopping_mall_customer_id: true,
      },
    });
  // Query for seller verifications
  const sellerVerifications =
    await MyGlobal.prisma.shopping_mall_seller_email_verifications.findMany({
      where: {
        deleted_at: null,
        shopping_mall_seller_id: { not: null }, // This should be properly typed as UUID
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        created_at: true,
        expires_at: true,
        updated_at: true,
        deleted_at: true,
        verified_at: true,
        shopping_mall_seller_id: true,
        email_verification_token: true, // Correct field name as defined in schema
      },
    });
  // Fetch all related customer and seller emails in single queries
  const customerIds = [
    ...new Set(customerVerifications.map((v) => v.shopping_mall_customer_id)),
  ];
  const sellerIds = [
    ...new Set(sellerVerifications.map((v) => v.shopping_mall_seller_id)),
  ];
  const customerEmails: Record<string, string | null> = {};
  if (customerIds.length > 0) {
    const customers = await MyGlobal.prisma.shopping_mall_customers.findMany({
      where: {
        id: { in: customerIds },
        deleted_at: null,
      },
      select: { id: true, email: true },
    });
    customers.forEach((c) => (customerEmails[c.id] = c.email));
  }
  const sellerEmails: Record<string, string | null> = {};
  if (sellerIds.length > 0) {
    const sellers = await MyGlobal.prisma.shopping_mall_sellers.findMany({
      where: {
        id: { in: sellerIds },
        deleted_at: null,
      },
      select: { id: true, email: true },
    });
    sellers.forEach((s) => (sellerEmails[s.id] = s.email));
  }
  // Combine and transform results with type guard
  const combinedResults = [...customerVerifications, ...sellerVerifications]
    .map((item) => {
      let email: string | null = null;
      let verificationType: "customer" | "seller";
      // Handle type guard for customer verification
      if (
        "shopping_mall_customer_id" in item &&
        item.shopping_mall_customer_id !== null
      ) {
        email = customerEmails[item.shopping_mall_customer_id] ?? null;
        verificationType = "customer";
      }
      // Handle type guard for seller verification
      else if (
        "shopping_mall_seller_id" in item &&
        item.shopping_mall_seller_id !== null
      ) {
        email = sellerEmails[item.shopping_mall_seller_id] ?? null;
        verificationType = "seller";
      } else {
        return null; // Skip invalid records
      }
      if (!email) return null;
      let status: "active" | "expired" | "verified" = "active";
      // Check verification status - safely access verified_at only for seller records
      if (
        verificationType === "seller" &&
        item.verified_at !== undefined &&
        item.verified_at !== null
      ) {
        status = "verified";
      } else if (item.expires_at && item.expires_at < new Date()) {
        status = "expired";
      }
      return {
        email: email satisfies string & tags.Format<"email"> as string,
        created_at: toISOStringSafe(item.created_at) satisfies string &
          tags.Format<"date-time"> as string,
        expires_at: toISOStringSafe(item.expires_at) satisfies string &
          tags.Format<"date-time"> as string,
        verified_at:
          verificationType === "seller" &&
          item.verified_at !== undefined &&
          item.verified_at !== null
            ? (toISOStringSafe(item.verified_at) satisfies string &
                tags.Format<"date-time"> as string)
            : null,
        status: status satisfies "active" | "expired" | "verified",
        verification_type: verificationType satisfies "customer" | "seller",
      };
    })
    .filter((item): item is Exclude<typeof item, null> => item !== null);
  // Count total records
  const total =
    (await MyGlobal.prisma.shopping_mall_customer_email_verifications.count({
      where: {
        deleted_at: null,
        shopping_mall_customer_id: { not: null },
      },
    })) +
    (await MyGlobal.prisma.shopping_mall_seller_email_verifications.count({
      where: {
        deleted_at: null,
        shopping_mall_seller_id: { not: null },
      },
    }));
  // Return paginated response
  return {
    data: combinedResults,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
