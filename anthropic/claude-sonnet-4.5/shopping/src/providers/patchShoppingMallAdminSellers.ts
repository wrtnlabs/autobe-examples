import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function patchShoppingMallAdminSellers(props: {
  admin: AdminPayload;
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      deleted_at: null,
    };

    if (props.body.search) {
      conditions.store_name = {
        contains: props.body.search,
        mode: "insensitive",
      };
    }

    if (props.body.status) {
      conditions.status = props.body.status;
    }

    if (props.body.created_after || props.body.created_before) {
      const createdAtCondition: Record<string, unknown> = {};
      if (props.body.created_after) {
        createdAtCondition.gte = props.body.created_after;
      }
      if (props.body.created_before) {
        createdAtCondition.lte = props.body.created_before;
      }
      conditions.created_at = createdAtCondition;
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();
  const orderByField = props.body.sort_by ?? "created_at";
  const orderDirection = props.body.order ?? "desc";

  const [sellers, totalCount] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: {
        [orderByField]: orderDirection,
      },
    }),
    MyGlobal.prisma.shopping_mall_sellers.count({
      where: whereCondition,
    }),
  ]);

  const data: IShoppingMallSeller.ISummary[] = sellers.map((seller) => {
    const summary: IShoppingMallSeller.ISummary = {
      id: seller.id,
      store_name: seller.store_name,
      email: seller.email,
      status: typia.assert<"pending" | "approved" | "rejected" | "suspended">(
        seller.status,
      ),
      email_verified: seller.email_verified,
    };
    return summary;
  });

  const totalPages = Math.ceil(totalCount / limit);

  return {
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages: totalPages,
    },
    data,
  };
}
