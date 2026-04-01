import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
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
import { RedditCommunityCommentAtSummaryTransformer } from "../transformers/RedditCommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.ICreate;
}): Promise<IRedditCommunityComment.ISummary> {
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId, deleted_at: null },
    });
  await MyGlobal.prisma.reddit_community_comment_votes.upsert({
    where: {
      reddit_community_member_id_reddit_community_comment_id: {
        reddit_community_member_id: props.member.id,
        reddit_community_comment_id: props.commentId,
      },
    },
    update: {
      direction: props.body.direction!,
      updated_at: new Date(),
    },
    create: {
      id: v4(),
      direction: props.body.direction!,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.member.id } },
      comment: { connect: { id: props.commentId } },
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...RedditCommunityCommentAtSummaryTransformer.select(),
    });
  return await RedditCommunityCommentAtSummaryTransformer.transform(updated);
}
