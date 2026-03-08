import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostVoteTransformer } from "../transformers/RedditPlatformPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformPostVotesVoteId(props: {
  voteId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformPostVote> {
  const vote =
    await MyGlobal.prisma.reddit_platform_post_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      ...RedditPlatformPostVoteTransformer.select(),
    });
  // Verify vote is not soft-deleted
  if (vote.deleted_at !== null) {
    throw new HttpException("Vote has been removed", 404);
  }
  return await RedditPlatformPostVoteTransformer.transform(vote);
}
