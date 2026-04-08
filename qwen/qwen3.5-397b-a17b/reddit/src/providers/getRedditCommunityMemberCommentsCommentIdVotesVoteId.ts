import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentVoteTransformer } from "../transformers/RedditCommunityCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommentVote> {
  const record =
    await MyGlobal.prisma.reddit_community_comment_votes.findFirstOrThrow({
      ...RedditCommunityCommentVoteTransformer.select(),
      where: {
        id: props.voteId,
        comment_id: props.commentId,
        deleted_at: null,
      },
    });
  return await RedditCommunityCommentVoteTransformer.transform(record);
}
