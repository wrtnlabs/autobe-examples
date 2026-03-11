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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerPasswordResets(props: {
  customer: CustomerPayload;
  body: IEcommerceMallSellerPasswordReset.IRequest;
}): Promise<IPageIEcommerceMallSellerPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause for filtering
  const whereInput: Prisma.ecommerce_mall_seller_password_resetsWhereInput = {
    ...(props.body.actorType && {
      seller: {
        approval_status:
          props.body.actorType === "seller" ? "approved" : undefined,
      },
    }),
    ...(props.body.email && {
      seller: {
        email: {
          contains: props.body.email,
          mode: "insensitive",
        },
      },
    }),
    ...(props.body.createdAtFrom && {
      created_at: {
        gte: toISOStringSafe(new Date(props.body.createdAtFrom)),
      },
    }),
    ...(props.body.createdAtTo && {
      created_at: {
        lte: toISOStringSafe(new Date(props.body.createdAtTo)),
      },
    }),
  };
  // Build ORDER BY clause
  const orderByInput:
    | Prisma.ecommerce_mall_seller_password_resetsOrderByWithRelationInput[]
    | undefined =
    props.body.sort === "expiredAt"
      ? [{ expired_at: props.body.sortOrder === "asc" ? "asc" : "desc" }]
      : props.body.sort === "requestStatus"
        ? undefined
        : props.body.sort === "actorType"
          ? undefined
          : props.body.sort === "email"
            ? [
                {
                  seller: {
                    email: props.body.sortOrder === "asc" ? "asc" : "desc",
                  },
                },
              ]
            : [{ created_at: props.body.sortOrder === "asc" ? "asc" : "desc" }];
  // Query data with relations
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
  // Count total records
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_password_resets.count({
      where: whereInput,
    });
  // Transform data using manual transformation (no transformer available for this type)
  const transformedData: IEcommerceMallSellerPasswordReset.ISummary[] =
    data.map((reset) => ({
      id: reset.id,
      email: reset.seller.email,
      expired_at: toISOStringSafe(reset.expired_at),
      created_at: toISOStringSafe(reset.created_at),
    }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
