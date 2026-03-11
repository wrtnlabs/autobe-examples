import { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerPasswordResetAtSummaryTransformer } from "../transformers/EcommerceMallSellerPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminPasswordResets(props: {
  admin: AdminPayload;
  body: IEcommerceMallSellerPasswordReset.IRequest;
}): Promise<IPageIEcommerceMallSellerPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause for seller password resets
  const sellerWhere: Prisma.ecommerce_mall_seller_password_resetsWhereInput =
    {};
  // Filter by request status (derived from expired_at comparison)
  const now = toISOStringSafe(new Date());
  if (props.body.requestStatus === "expired") {
    sellerWhere.expired_at = { lt: now };
  } else if (props.body.requestStatus === "used") {
    // Used tokens are expired and consumed
    sellerWhere.expired_at = { lt: now };
  } else if (props.body.requestStatus === "pending") {
    // Pending tokens are not yet expired
    sellerWhere.expired_at = { gte: now };
  }
  // Filter by email pattern (seller email)
  if (props.body.email !== undefined) {
    sellerWhere.seller = {
      email: {
        contains: props.body.email,
        mode: "insensitive",
      } as Prisma.StringFilter,
    };
  }
  // Filter by actor type
  if (props.body.actorType !== undefined) {
    if (props.body.actorType === "seller") {
      // Only return seller resets (seller_id exists)
      sellerWhere.seller_id = { not: undefined };
    } else if (props.body.actorType === "customer") {
      // No seller resets for customer type
      // This filter would result in empty set for this query
      // In a real implementation, we'd use UNION ALL
      return {
        pagination: {
          current: page,
          limit: limit,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
        data: [],
      } satisfies IPageIEcommerceMallSellerPasswordReset.ISummary;
    } else if (props.body.actorType === "admin") {
      // No seller resets for admin type
      return {
        pagination: {
          current: page,
          limit: limit,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
        data: [],
      } satisfies IPageIEcommerceMallSellerPasswordReset.ISummary;
    }
  }
  // Filter by date range
  const created_atFilter: Prisma.DateTimeFilter = {};
  if (props.body.createdAtFrom !== undefined) {
    created_atFilter.gte = props.body.createdAtFrom;
  }
  if (props.body.createdAtTo !== undefined) {
    created_atFilter.lte = props.body.createdAtTo;
  }
  if (Object.keys(created_atFilter).length > 0) {
    sellerWhere.created_at = created_atFilter;
  }
  // Build search query
  let finalWhere: Prisma.ecommerce_mall_seller_password_resetsWhereInput =
    sellerWhere;
  if (props.body.search !== undefined && props.body.search.trim().length > 0) {
    finalWhere = {
      ...sellerWhere,
      OR: [
        { reset_token: { contains: props.body.search } as Prisma.StringFilter },
        {
          seller: {
            email: {
              contains: props.body.search,
              mode: "insensitive",
            } as Prisma.StringFilter,
          },
        },
      ],
    };
  }
  // Build ORDER BY
  const orderByInput: Prisma.ecommerce_mall_seller_password_resetsOrderByWithRelationInput =
    props.body.sort === "createdAt"
      ? ({
          created_at: props.body.sortOrder === "asc" ? "asc" : "desc",
        } as Prisma.ecommerce_mall_seller_password_resetsOrderByWithRelationInput)
      : props.body.sort === "expiredAt"
        ? ({
            expired_at: props.body.sortOrder === "asc" ? "asc" : "desc",
          } as Prisma.ecommerce_mall_seller_password_resetsOrderByWithRelationInput)
        : props.body.sort === "requestStatus"
          ? { created_at: "desc" as const } // Status doesn't have direct sort, fallback to date
          : props.body.sort === "actorType"
            ? { created_at: "desc" as const } // Actor type doesn't have direct sort
            : props.body.sort === "email"
              ? ({
                  seller: {
                    email: props.body.sortOrder === "asc" ? "asc" : "desc",
                  } as Prisma.ecommerce_mall_sellersOrderByWithRelationInput,
                } as Prisma.ecommerce_mall_seller_password_resetsOrderByWithRelationInput)
              : { created_at: "desc" as const };
  // Query with transformer
  const data =
    await MyGlobal.prisma.ecommerce_mall_seller_password_resets.findMany({
      where: finalWhere,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallSellerPasswordResetAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_password_resets.count({
      where: finalWhere,
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallSellerPasswordResetAtSummaryTransformer.transform,
  );
  // Create audit log
  await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: props.admin.id,
      action_type: "password_reset_list",
      target_entity_type: "ecommerce_mall_seller_password_resets",
      updated_at: toISOStringSafe(new Date()),
      created_at: toISOStringSafe(new Date()),
    },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallSellerPasswordReset.ISummary;
}
