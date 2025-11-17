import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallAdmins(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.IRequest;
}): Promise<IPageIShoppingMallAdmin.ISummary> {
  const page = props.body.page > 0 ? props.body.page : 1;
  const limit = props.body.limit > 0 ? props.body.limit : 100;
  const skip = (page - 1) * limit;

  // Build search filter if search string is provided
  const where = props.body.search
    ? {
        OR: [
          {
            email: {
              contains: props.body.search,
              mode: "insensitive" satisfies Prisma.QueryMode as Prisma.QueryMode,
            },
          },
          // Add other fields to search if applicable
        ],
      }
    : undefined;

  // Build orderBy object if sortField and sortOrder are provided
  const orderBy =
    props.body.sortField && props.body.sortOrder
      ? {
          [props.body.sortField]: props.body.sortOrder satisfies
            | "asc"
            | "desc" as "asc" | "desc",
        }
      : { created_at: "desc" as "desc" };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admins.findMany({
      where: where === undefined ? {} : where,
      skip: page satisfies number as number,
      take: limit satisfies number as number,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_admins.count({
      where: where === undefined ? {} : where,
    }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data: data.map((admin) => ({
      id: admin.id,
      email: admin.email,
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
    })),
  };
}
