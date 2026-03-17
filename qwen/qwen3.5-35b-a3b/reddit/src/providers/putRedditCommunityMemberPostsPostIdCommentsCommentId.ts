import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentTransformer } from "../transformers/RedditCommunityCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IUpdate;
}): Promise<IRedditCommunityComment> {
  // 1. Find comment with minimal select for ownership validation
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_community_members_id: true,
        reddit_community_posts_id: true,
      },
    });
  // 2. Verify comment belongs to the specified post
  if (comment.reddit_community_posts_id !== props.postId) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify comment ownership
  if (comment.reddit_community_members_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Update comment body and timestamp
  await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: props.commentId },
    data: {
      body: props.body.body,
      updated_at: new Date(),
    },
  });
  // 5. Return updated comment with full data
  const updated =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...RedditCommunityCommentTransformer.select(),
    });
  return await RedditCommunityCommentTransformer.transform(updated);
}
