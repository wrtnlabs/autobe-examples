import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IPageICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorUsers(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformUser.IRequest;
}): Promise<IPageICommunityPlatformUser.ISummary> {
  const {
    email,
    status,
    created_from,
    created_to,
    updated_from,
    updated_to,
    page = 1,
    limit = 100,
    sort_by = "created_at",
    sort_order = "desc",
  } = props.body;

  // Build Prisma where condition**
  const where = {
    ...(email !== undefined && email !== null
      ? { email: { contains: email } }
      : {}),
    ...(status !== undefined && status !== null ? { status } : {}),
    ...(created_from !== undefined && created_from !== null
      ? { created_at: { gte: created_from } }
      : {}),
    ...(created_to !== undefined && created_to !== null
      ? {
          created_at: {
            ...(created_from !== undefined && created_from !== null
              ? { gte: created_from }
              : {}),
            lte: created_to,
          },
        }
      : {}),
    ...(updated_from !== undefined && updated_from !== null
      ? { updated_at: { gte: updated_from } }
      : {}),
    ...(updated_to !== undefined && updated_to !== null
      ? {
          updated_at: {
            ...(updated_from !== undefined && updated_from !== null
              ? { gte: updated_from }
              : {}),
            lte: updated_to,
          },
        }
      : {}),
  };

  // Pagination
  const take = limit;
  const skip = (page - 1) * limit;

  // Sorting (only allow certain sort fields)
  const sortFieldList = ["email", "status", "created_at", "updated_at"];
  const orderByField = sortFieldList.includes(sort_by) ? sort_by : "created_at";
  const orderBy = { [orderByField]: sort_order === "asc" ? "asc" : "desc" };

  // Run query/count concurrently
  const [result, total] = await Promise.all([
    MyGlobal.prisma.community_platform_users.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
      },
    }),
    MyGlobal.prisma.community_platform_users.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    },
    data: result.map((user) => ({ id: user.id })),
  };
}
