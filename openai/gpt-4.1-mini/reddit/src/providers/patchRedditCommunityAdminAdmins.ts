import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { IPageIRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminAdmins(props: {
  admin: AdminPayload;
  body: IRedditCommunityAdmin.IRequest;
}): Promise<IPageIRedditCommunityAdmin.ISummary> {
  const { admin, body } = props;

  // Normalize page and limit to numbers with boundaries
  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 10;
  const page = Number(pageRaw) < 1 ? 1 : Number(pageRaw);
  const limit =
    Number(limitRaw) < 1 ? 1 : Number(limitRaw) > 100 ? 100 : Number(limitRaw);

  const skip = (page - 1) * limit;

  const orderByField =
    body.orderBy === "created_at" ? "created_at" : "created_at";
  const orderDirection = body.orderDirection === "asc" ? "asc" : "desc";

  const where: any = {};

  if (body.search !== undefined && body.search !== null && body.search !== "") {
    where.OR = [
      { redditCommunityUser: { email: { contains: body.search } } },
      { redditCommunityUser: { id: body.search } },
    ];
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_admin.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
      select: {
        id: true,
        user_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.reddit_community_admin.count({ where }),
  ]);

  const data = results.map((admin) => ({
    id: admin.id,
    user_id: admin.user_id,
    created_at: toISOStringSafe(admin.created_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
