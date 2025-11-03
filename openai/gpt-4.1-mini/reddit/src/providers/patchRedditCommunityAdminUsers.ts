import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import { IPageIRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminUsers(props: {
  admin: AdminPayload;
  body: IRedditCommunityUser.IRequest;
}): Promise<IPageIRedditCommunityUser.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = Math.min(body.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  const whereConditions: { email?: { contains: string } } = {};

  if (
    body.search !== undefined &&
    body.search !== null &&
    body.email !== undefined &&
    body.email !== null
  ) {
    whereConditions.email = { contains: `${body.search} ${body.email}` };
  } else if (body.search !== undefined && body.search !== null) {
    whereConditions.email = { contains: body.search };
  } else if (body.email !== undefined && body.email !== null) {
    whereConditions.email = { contains: body.email };
  }

  const orderBy = body.order_by
    ? {
        [body.order_by]: (body.order_direction === "asc"
          ? "asc"
          : "desc") satisfies "asc" | "desc" as "asc" | "desc",
      }
    : { created_at: "desc" satisfies "asc" | "desc" as "asc" | "desc" };

  const [users, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_user.findMany({
      where: whereConditions,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
      },
    }),
    MyGlobal.prisma.reddit_community_user.count({ where: whereConditions }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: users.map((user) => ({
      id: user.id,
      email: user.email,
    })),
  };
}
