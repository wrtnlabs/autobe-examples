import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import { IPageIRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserKarma";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityUserKarma(props: {
  admin: AdminPayload;
  body: IRedditCommunityUserKarma.IRequest;
}): Promise<IPageIRedditCommunityUserKarma.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  if (page < 1 || limit < 1) {
    throw new HttpException("Invalid pagination parameters", 400);
  }

  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(props.body.user_id && { registered_user_id: props.body.user_id }),
    ...(props.body.karma_min !== undefined || props.body.karma_max !== undefined
      ? {
          // No filter applied as no total karma field exists
        }
      : {}),
    ...(props.body.search
      ? {
          karma_type: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
  };

  const [datas, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_user_karma.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: "asc" },
    }),
    MyGlobal.prisma.reddit_community_user_karma.count({ where }),
  ]);

  const data: IRedditCommunityUserKarma.ISummary[] = datas.map((item) => ({
    user_id: item.registered_user_id satisfies string as string,
    karma_type: "" satisfies string as string,
    post_karma: item.karma satisfies number as number,
    comment_karma: item.karma satisfies number as number,
    awardee_karma: item.karma satisfies number as number,
    awarder_karma: item.karma satisfies number as number,
  }));

  return {
    data,
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
  } satisfies IPageIRedditCommunityUserKarma.ISummary;
}
