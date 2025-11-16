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

export async function patchRedditCommunityAdminRedditCommunityAdmins(props: {
  admin: AdminPayload;
  body: IRedditCommunityAdmin.IRequest;
}): Promise<IPageIRedditCommunityAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where = props.body.search
    ? { OR: [{ email: { contains: props.body.search } }] }
    : {};

  const orderByField = props.body.orderBy ?? "created_at";
  const orderByDirection = props.body.order ?? "desc";

  const [items, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_admins.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderByField]: orderByDirection },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        password_hash: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.reddit_community_admins.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map((admin) => ({
      id: admin.id,
      email: admin.email,
      created_at: toISOStringSafe(admin.created_at),
      is_active: true,
    })),
  };
}
