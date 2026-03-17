import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import { IRedditCloneKarmaScoreChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScoreChange";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneKarmaScoreChangeTransformer } from "../transformers/RedditCloneKarmaScoreChangeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneKarmaScoresKarmaScoreIdChangesChangeId(props: {
  karmaScoreId: string & tags.Format<"uuid">;
  changeId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneKarmaScoreChange> {
  const change =
    await MyGlobal.prisma.reddit_clone_karma_score_changes.findUniqueOrThrow({
      where: {
        id: props.changeId,
        reddit_clone_karma_score_id: props.karmaScoreId,
      },
      ...RedditCloneKarmaScoreChangeTransformer.select(),
    });
  return await RedditCloneKarmaScoreChangeTransformer.transform(change);
}
