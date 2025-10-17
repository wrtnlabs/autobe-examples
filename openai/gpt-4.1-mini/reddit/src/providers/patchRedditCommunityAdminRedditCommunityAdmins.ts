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
import { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityAdmins(props: {
  admin: AdminPayload;
  body: IRedditCommunityAdmin.IRequest;
}): Promise<IPageIRedditCommunityAdmin> {
  const { body } = props;

  const page = 1;
  const limit = 10;

  const where = {
    ...(body.email !== "" && { email: { contains: body.email } }),
    admin_level: { gte: body.admin_level },
    created_at: { gte: body.created_at },
    updated_at: { lte: body.updated_at },
    deleted_at:
      body.deleted_at === undefined
        ? undefined
        : body.deleted_at === null
          ? null
          : body.deleted_at,
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_admins.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_admins.count({ where }),
  ]);

  const data = results.map((item) => ({
    id: item.id,
    email: item.email,
    password_hash: item.password_hash,
    admin_level: item.admin_level,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
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
