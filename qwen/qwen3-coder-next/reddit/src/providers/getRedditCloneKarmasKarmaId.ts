import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarma";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneKarmasKarmaId(props: {
  karmaId: string;
}): Promise<IRedditCloneKarma> {
  const karma = await MyGlobal.prisma.reddit_clone_karmas.findUniqueOrThrow({
    where: { id: props.karmaId as string & tags.Format<"uuid"> },
    select: {
      id: true,
      member_id: true,
      karma_score: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Query related content to calculate post and comment counts
  const [postCount, commentCount] = await Promise.all([
    MyGlobal.prisma.reddit_clone_content_posts.count({
      where: { author_id: karma.member_id },
    }),
    MyGlobal.prisma.reddit_clone_content_comments.count({
      where: { member_id: karma.member_id },
    }),
  ]);
  return {
    date: toISOStringSafe(karma.created_at),
    scoreChange: 0,
    percentageChange: 0,
    postCount: postCount as number & tags.Type<"int32">,
    commentCount: commentCount as number & tags.Type<"int32">,
    totalScore: karma.karma_score,
  };
}
