import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneMemberSessionAtSummaryTransformer } from "../transformers/RedditCloneMemberSessionAtSummaryTransformer";
import { RedditClonePostImageTransformer } from "../transformers/RedditClonePostImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditClonePostsPostIdVotesVoteId(props: {
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<IRedditClonePostImage> {
  const vote = await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
    where: {
      id: props.voteId,
      reddit_clone_post_id: props.postId,
    },
    select: {
      id: true,
      direction: true,
      created_at: true,
      updated_at: true,
      reddit_clone_post_id: true,
      member: RedditCloneMemberSessionAtSummaryTransformer.select(),
    },
  });
  return await RedditClonePostImageTransformer.transform({
    ...vote,
    post: {
      id: vote.reddit_clone_post_id,
    },
  });
}
