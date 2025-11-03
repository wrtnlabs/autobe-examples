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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminGuests(props: {
  admin: AdminPayload;
  body: IRedditCommunityGuest.IRequest;
}): Promise<IPageIRedditCommunityGuest.ISummary> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  const where: Prisma.reddit_community_guestWhereInput = {};

  if (body.search) {
    const searchLower = body.search.toLowerCase();
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(searchLower)) {
      Object.assign(where, { id: searchLower });
    }
  }

  const orderBy =
    body.order_by && body.order_direction
      ? ({ [body.order_by]: body.order_direction } satisfies Record<
          string,
          Prisma.SortOrder
        > as Prisma.reddit_community_guestOrderByWithRelationInput)
      : ({
          created_at: "desc" as Prisma.SortOrder,
        } satisfies Prisma.reddit_community_guestOrderByWithRelationInput);

  const [results, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_guest.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_guest.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
