import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentDeletion";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommentDeletionTransformer } from "../transformers/RedditCommunityCommentDeletionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityCommentsCommentIdDeletionsDeletionId(props: {
  commentId: string & tags.Format<"uuid">;
  deletionId: string & tags.Format<"uuid">;
  customer: {
    id: string & tags.Format<"uuid">;
  };
}): Promise<IRedditCommunityCommentDeletion> {
  const deletion =
    await MyGlobal.prisma.reddit_community_comment_deletions.findUniqueOrThrow({
      where: { id: props.deletionId },
      ...RedditCommunityCommentDeletionTransformer.select(),
    });
  const commentSummary =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        reddit_community_posts_id: true,
      },
    });
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: commentSummary.reddit_community_posts_id },
    select: {
      community_id: true,
    },
  });
  const moderators = await MyGlobal.prisma.reddit_community_moderators.findMany(
    {
      where: {
        community: { id: post.community_id },
      },
      select: {
        reddit_community_moderator_id: true,
      },
    },
  );
  const isModerator = moderators.some(
    (m) => m.reddit_community_moderator_id === props.customer.id,
  );
  if (!isModerator && deletion.deletedBy !== null) {
    const isDeletionActor = deletion.deletedBy.member.id === props.customer.id;
    if (!isDeletionActor) {
      throw new HttpException("Forbidden", 403);
    }
  }
  if (!isModerator && deletion.deletedBy === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await RedditCommunityCommentDeletionTransformer.transform(deletion);
}
