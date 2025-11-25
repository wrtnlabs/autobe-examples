import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminActorsSellers(props: {
  admin: AdminPayload;
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller> {
  const {
    business_name,
    status,
    created_at_from,
    created_at_to,
    updated_at_from,
    updated_at_to,
  } = props.body;

  // Pagination default values according to IPage contract
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  // Build where condition - only include if value is provided
  const where: any = {
    deleted_at: null,
  };

  if (business_name !== undefined) {
    where.business_name = {
      contains: business_name,
      mode: "insensitive",
    };
  }

  if (status !== undefined) {
    where.status = status;
  }

  if (created_at_from !== undefined || created_at_to !== undefined) {
    where.created_at = {};
    if (created_at_from !== undefined) {
      where.created_at.gte = created_at_from;
    }
    if (created_at_to !== undefined) {
      where.created_at.lte = created_at_to;
    }
  }

  if (updated_at_from !== undefined || updated_at_to !== undefined) {
    where.updated_at = {};
    if (updated_at_from !== undefined) {
      where.updated_at.gte = updated_at_from;
    }
    if (updated_at_to !== undefined) {
      where.updated_at.lte = updated_at_to;
    }
  }

  // Fetch paginated results
  const [sellers, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
    }),
    MyGlobal.prisma.shopping_mall_sellers.count({
      where,
    }),
  ]);

  // Transform result to match IPageIShoppingMallSeller type
  const data = sellers.map((seller) => ({
    id: seller.id,
    email: seller.email,
    business_name: seller.business_name,
    business_address: seller.business_address,
    tax_id: seller.tax_id,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    status: seller.status satisfies string as
      | "active"
      | "pending_verification"
      | "suspended"
      | "deleted",
    deleted_at: seller.deleted_at
      ? toISOStringSafe(seller.deleted_at)
      : "1970-01-01T00:00:00Z",
  }));

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
