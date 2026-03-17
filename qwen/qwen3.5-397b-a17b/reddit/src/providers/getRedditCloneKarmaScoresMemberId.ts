import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneKarmaScoreTransformer } from "../transformers/RedditCloneKarmaScoreTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneKarmaScoresMemberId(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneKarmaScore> {
  const karmaScore =
    await MyGlobal.prisma.reddit_clone_karma_scores.findUniqueOrThrow({
      where: { member_id: props.memberId },
      ...RedditCloneKarmaScoreTransformer.select(),
    });
  return await RedditCloneKarmaScoreTransformer.transform(karmaScore);
}
