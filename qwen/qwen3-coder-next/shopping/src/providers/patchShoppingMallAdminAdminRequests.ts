import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminRequests(props: {
  admin: AdminPayload;
  page?: number;
  limit?: number;
  status?: "pending" | "approved" | "rejected";
}): Promise<IPageIShoppingMallAdmin.ISummary> {
  const { page = 1, limit = 20, status } = props;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_adminsWhereInput = {
    deleted_at: null,
    ...(status && { status }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admins.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_admins.count({ where }),
  ]);
  return {
    data: data.map((request) => ({
      id: request.id as string & tags.Format<"uuid">,
      user: {
        id: request.id as string & tags.Format<"uuid">,
        email: request.email || "",
      },
      reason: "",
      status: "pending" as "pending" | "approved" | "rejected",
      created_at: toISOStringSafe(request.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(request.updated_at) as string &
        tags.Format<"date-time">,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
