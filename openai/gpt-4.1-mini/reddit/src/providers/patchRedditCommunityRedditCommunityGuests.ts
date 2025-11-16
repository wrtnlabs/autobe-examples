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
  const page = (props.body.page ?? 1) satisfies number as number;
  const limit = (props.body.limit ?? 100) satisfies number as number;
  const skip = (page - 1) * limit;

  const whereConditions = {} satisfies Prisma.reddit_community_guestsWhereInput;

  const orderBy = props.body.sort_by
    ? ({
        [props.body.sort_by]: props.body.order === "asc" ? "asc" : "desc",
      } satisfies Prisma.reddit_community_guestsOrderByWithRelationInput)
    : ({
        created_at: "desc",
      } satisfies Prisma.reddit_community_guestsOrderByWithRelationInput);

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_guests.findMany({
      where: whereConditions,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
      },
    }),
    MyGlobal.prisma.reddit_community_guests.count({ where: whereConditions }),
  ]);

  return {
    data: data.map((guest) => ({
      id: guest.id,
      nickname: "",
    })),
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
