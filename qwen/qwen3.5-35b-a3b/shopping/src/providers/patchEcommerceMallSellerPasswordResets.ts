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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerPasswordResets(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerPasswordReset.IRequest;
}): Promise<IPageIEcommerceMallSellerPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE filter
  const whereInput: Prisma.ecommerce_mall_seller_password_resetsWhereInput = {};
  // Add email filter
  if (props.body.email) {
    whereInput.seller = {
      email: {
        contains: props.body.email.toLowerCase(),
        mode: Prisma.QueryMode.insensitive,
      },
    };
  }
  // Add createdAt date range filter
  if (props.body.createdAtFrom || props.body.createdAtTo) {
    whereInput.created_at = {};
    if (props.body.createdAtFrom) {
      whereInput.created_at.gte = new Date(props.body.createdAtFrom);
    }
    if (props.body.createdAtTo) {
      whereInput.created_at.lte = new Date(props.body.createdAtTo);
    }
  }
  // Build ORDER BY
  let orderByInput: Prisma.ecommerce_mall_seller_password_resetsOrderByWithRelationInput;
  if (props.body.sort === "expiredAt") {
    orderByInput = {
      expired_at:
        props.body.sortOrder === "asc" ? ("asc" as const) : ("desc" as const),
    };
  } else if (props.body.sort === "email") {
    orderByInput = {
      seller: {
        email:
          props.body.sortOrder === "asc" ? ("asc" as const) : ("desc" as const),
      },
    };
  } else if (props.body.sort === "requestStatus") {
    // Not applicable for seller password resets
    orderByInput = {
      created_at:
        props.body.sortOrder === "asc" ? ("asc" as const) : ("desc" as const),
    };
  } else if (props.body.sort === "actorType") {
    // Not applicable for seller password resets
    orderByInput = {
      created_at:
        props.body.sortOrder === "asc" ? ("asc" as const) : ("desc" as const),
    };
  } else {
    // Default sort by createdAt descending
    orderByInput = {
      created_at:
        props.body.sortOrder === "asc" ? ("asc" as const) : ("desc" as const),
    };
  }
  // Execute query
  const data =
    await MyGlobal.prisma.ecommerce_mall_seller_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      include: {
        seller: {
          select: {
            email: true,
          },
        },
      },
    });
  // Count total
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_password_resets.count({
      where: whereInput,
    });
  // Transform to response format
  const transformedData: Array<IEcommerceMallSellerPasswordReset.ISummary> =
    await ArrayUtil.asyncMap(data, async (reset) => ({
      id: reset.id as string & tags.Format<"uuid">,
      email: reset.seller.email as string & tags.Format<"email">,
      expired_at: reset.expired_at.toISOString(),
      created_at: reset.created_at.toISOString(),
    }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallSellerPasswordReset.ISummary;
}
