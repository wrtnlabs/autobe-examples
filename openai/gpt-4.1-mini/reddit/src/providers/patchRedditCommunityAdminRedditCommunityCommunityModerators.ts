import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IPageIRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityModerator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityCommunityModerators(props: {
  admin: AdminPayload;
  body: IRedditCommunityCommunityModerator.IRequest;
}): Promise<IPageIRedditCommunityCommunityModerator.ISummary> {
  const page = props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit > 0 && props.body.limit <= 100 ? props.body.limit : 100;
  const skip = (page - 1) * limit;

  const where = {
    ...(props.body.id && { id: props.body.id }),
    ...(props.body.email && { email: props.body.email }),
    ...(props.body.search_email && {
      email: { contains: props.body.search_email },
    }),
    ...(props.body.created_at_from || props.body.created_at_to
      ? {
          created_at: {
            ...(props.body.created_at_from && {
              gte: props.body.created_at_from,
            }),
            ...(props.body.created_at_to && { lt: props.body.created_at_to }),
          },
        }
      : {}),
    ...(props.body.include_deleted ? {} : { deleted_at: null }),
  };

  const orderBy: { [key: string]: "asc" | "desc" } = props.body.sort_by
    ? { [props.body.sort_by]: props.body.sort_order ?? "desc" }
    : { created_at: "desc" };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_community_moderators.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.reddit_community_community_moderators.count({ where }),
  ]);

  return {
    data: data.map((record) => ({
      id: record.id,
      user_id: "00000000-0000-0000-0000-000000000000",
      community_id: "00000000-0000-0000-0000-000000000000",
      role: "",
      permissions: [],
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
