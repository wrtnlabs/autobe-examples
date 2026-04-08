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
import { RedditCommunityCommentVoteCollector } from "../collectors/RedditCommunityCommentVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentVoteTransformer } from "../transformers/RedditCommunityCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.ICreate;
}): Promise<IRedditCommunityCommentVote> {
  await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
    where: {
      id: props.commentId,
      deleted_at: null,
    },
  });
  const existingVote =
    await MyGlobal.prisma.reddit_community_comment_votes.findFirst({
      where: {
        member_id: props.member.id,
        comment_id: props.commentId,
      },
    });
  if (existingVote) {
    await MyGlobal.prisma.reddit_community_comment_votes.update({
      where: {
        id: existingVote.id,
      },
      data: {
        value: props.body.value,
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    const updated =
      await MyGlobal.prisma.reddit_community_comment_votes.findUniqueOrThrow({
        where: { id: existingVote.id },
        ...RedditCommunityCommentVoteTransformer.select(),
      });
    return await RedditCommunityCommentVoteTransformer.transform(updated);
  } else {
    const created = await MyGlobal.prisma.reddit_community_comment_votes.create(
      {
        data: await RedditCommunityCommentVoteCollector.collect({
          body: props.body,
          member: { id: props.member.id },
          comment: { id: props.commentId },
        }),
        ...RedditCommunityCommentVoteTransformer.select(),
      },
    );
    return await RedditCommunityCommentVoteTransformer.transform(created);
  }
}
