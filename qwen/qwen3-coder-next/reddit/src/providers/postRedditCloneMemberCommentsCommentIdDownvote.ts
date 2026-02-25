import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneContentPostVoteCollector } from "../collectors/RedditCloneContentPostVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneContentPostVoteTransformer } from "../transformers/RedditCloneContentPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommentsCommentIdDownvote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneContentPostVote.ICreate;
}): Promise<IRedditCloneContentPostVote> {
  const voteValue =
    props.body.voteType === "upvote"
      ? 1
      : props.body.voteType === "downvote"
        ? -1
        : 0;
  const created = await MyGlobal.prisma.reddit_clone_content_post_votes.create({
    data: await RedditCloneContentPostVoteCollector.collect({
      body: props.body,
      redditCloneMembers: { id: props.member.id },
      redditCloneContentPosts: { id: props.commentId },
    }),
    ...RedditCloneContentPostVoteTransformer.select(),
  });
  return await RedditCloneContentPostVoteTransformer.transform(created);
}
