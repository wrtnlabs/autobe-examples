import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchRedditCommunityRedditCommunityGuests(props: {
  body: IRedditCommunityGuest.IRequest;
}): Promise<IPageIRedditCommunityGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const createdAtCondition = {
    ...(props.body.filterStartDate ? { gte: props.body.filterStartDate } : {}),
    ...(props.body.filterEndDate ? { lte: props.body.filterEndDate } : {}),
  };

  const where = {
    deleted_at: null as null,
    ...(Object.keys(createdAtCondition).length > 0
      ? { created_at: createdAtCondition }
      : {}),
  };

  const sortDirection = (props.body.sortDirection ?? "asc") satisfies
    | "asc"
    | "desc";

  const orderBy = props.body.sortBy
    ? { [props.body.sortBy]: sortDirection }
    : { created_at: "desc" as "desc" };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_guests.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.reddit_community_guests.count({ where }),
  ]);

  return {
    data: data.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      ip_address: "",
      user_agent: "",
      created_at: toISOStringSafe(item.created_at),
      last_seen: toISOStringSafe(item.updated_at),
      session_count: 0,
      is_banned: false,
      ban_reason: null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
