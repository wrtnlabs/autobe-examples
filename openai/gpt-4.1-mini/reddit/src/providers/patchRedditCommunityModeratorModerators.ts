import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchRedditCommunityModeratorModerators(props: {
  moderator: ModeratorPayload;
  body: IRedditCommunityModerator.IRequest;
}): Promise<IPageIRedditCommunityModerator.ISummary> {
  const { body } = props;
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const createdAtFilter = {
    ...(body.created_at_from !== undefined && body.created_at_from !== null
      ? { gte: body.created_at_from }
      : {}),
    ...(body.created_at_to !== undefined && body.created_at_to !== null
      ? { lte: body.created_at_to }
      : {}),
  } satisfies {
    gte?: (string & tags.Format<"date-time">) | undefined;
    lte?: (string & tags.Format<"date-time">) | undefined;
  };

  const whereConditions = {
    ...(body.user_id !== undefined && body.user_id !== null
      ? { reddit_community_user_id: body.user_id }
      : {}),
    ...(Object.keys(createdAtFilter).length > 0
      ? { created_at: createdAtFilter }
      : {}),
    ...(body.search !== undefined
      ? {
          AND: [
            {
              reddit_community_user: { email: { contains: body.search } },
            } as unknown as Prisma.reddit_community_moderatorWhereInput,
          ],
        }
      : {}),
  } as Prisma.reddit_community_moderatorWhereInput;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_moderator.findMany({
      where: whereConditions,
      orderBy:
        body.sortBy === "created_at" &&
        (body.sortOrder === "asc" || body.sortOrder === "desc")
          ? { created_at: body.sortOrder }
          : { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { reddit_community_user: true } as any,
    }),
    MyGlobal.prisma.reddit_community_moderator.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((moderator) => ({
      id: moderator.id,
      user_id: moderator.user_id,
      created_at: toISOStringSafe(moderator.created_at),
      user_email: (moderator as any).reddit_community_user.email as string,
      user_created_at: toISOStringSafe(
        (moderator as any).reddit_community_user.created_at,
      ),
    })),
  } satisfies IPageIRedditCommunityModerator.ISummary;
}
