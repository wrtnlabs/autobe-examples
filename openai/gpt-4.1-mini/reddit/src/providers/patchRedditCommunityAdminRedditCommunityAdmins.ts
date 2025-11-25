import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.reddit_community_adminsWhereInput = {
    ...(props.body.email && { email: props.body.email }),
    ...(props.body.search && { email: { contains: props.body.search } }),
    ...(props.body.created_at_from || props.body.created_at_to
      ? {
          created_at: {
            ...(props.body.created_at_from && {
              gte: props.body.created_at_from,
            }),
            ...(props.body.created_at_to && { lte: props.body.created_at_to }),
          },
        }
      : {}),
    ...(props.body.is_active !== undefined
      ? props.body.is_active
        ? { deleted_at: null }
        : { NOT: { deleted_at: null } }
      : {}),
  };

  const total = await MyGlobal.prisma.reddit_community_admins.count({ where });

  const orderBy =
    props.body.sort_by === "email"
      ? { email: props.body.order ?? "asc" }
      : { created_at: props.body.order ?? "desc" };

  const records = await MyGlobal.prisma.reddit_community_admins.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  const data = records.map((record) => ({
    id: record.id,
    email: record.email,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
