import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import { IPageIEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchEconomicBoardAdminAdmins(props: {
  admin: AdminPayload;
  body: IEconomicBoardAdmin.IRequest;
}): Promise<IPageIEconomicBoardAdmin.ISummary> {
  const { body } = props;

  // Build where clause with optional filters
  const whereConditions = {
    ...(body.email !== undefined &&
      body.email !== null && {
        email: { contains: body.email },
      }),
    ...(body.lastLoginFrom !== undefined &&
      body.lastLoginFrom !== null && {
        last_login: { gte: body.lastLoginFrom },
      }),
    ...(body.lastLoginTo !== undefined &&
      body.lastLoginTo !== null && {
        last_login: { lte: body.lastLoginTo },
      }),
    ...(body.is_active !== undefined && {
      is_active: body.is_active,
    }),
  };

  // Build orderBy clause inline
  const orderBy = (body.sort === "email"
    ? { email: body.order === "desc" ? "desc" : "asc" }
    : body.sort === "created_at"
      ? { created_at: body.order === "desc" ? "desc" : "asc" }
      : body.sort === "last_login"
        ? { last_login: body.order === "desc" ? "desc" : "asc" }
        : {
            last_login: "desc",
          }) satisfies Prisma.economic_board_adminOrderByWithRelationInput as Prisma.economic_board_adminOrderByWithRelationInput;

  // Pagination parameters
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 25);
  const skip = (page - 1) * limit;

  // Execute queries
  const [admins, total] = await Promise.all([
    MyGlobal.prisma.economic_board_admin.findMany({
      where: whereConditions,
      orderBy: orderBy,
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.economic_board_admin.count({ where: whereConditions }),
  ]);

  // Convert Date to ISO string for all returned fields
  const formattedAdmins = admins.map((admin) => ({
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    last_login: toISOStringSafe(admin.last_login),
    is_active: admin.is_active,
    auth_jwt_id: admin.auth_jwt_id,
  }));

  // Format pagination with Number() to strip branded types
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / limit),
    },
    data: formattedAdmins,
  };
}
