import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityCommentCollector } from "../collectors/CommunityCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityCommentTransformer } from "../transformers/CommunityCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string;
  body: ICommunityComment.ICreate;
}): Promise<ICommunityComment> {
  // 1. Validate post exists and is not deleted
  const post = await MyGlobal.prisma.community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      is_deleted: true,
      community_id: true,
    },
  });
  if (post.is_deleted) {
    throw new HttpException("POST_DELETED", 400);
  }
  // 2. Check if member is banned from the community
  const now = new Date();
  const ban = await MyGlobal.prisma.community_bans.findFirst({
    where: {
      community_id: post.community_id,
      member_id: props.member.id,
      OR: [{ expired_at: null }, { expired_at: { gt: now } }],
    },
  });
  if (ban) {
    throw new HttpException("USER_BANNED_FROM_COMMUNITY", 403);
  }
  // 3. Strip and validate content
  const strippedContent = props.body.content.trim();
  if (strippedContent.length === 0) {
    throw new HttpException("COMMENT_EMPTY_CONTENT", 400);
  }
  if (strippedContent.length > 10000) {
    throw new HttpException("COMMENT_TOO_LONG", 400);
  }
  // 4. Create comment using collector
  const commentData = await CommunityCommentCollector.collect({
    body: { ...props.body, content: strippedContent },
    communityPosts: { id: props.postId },
    communityMembers: { id: props.member.id },
  });
  const created = await MyGlobal.prisma.community_comments.create({
    data: commentData,
    ...CommunityCommentTransformer.select(),
  });
  // 5. Increment post comment count
  await MyGlobal.prisma.community_posts.update({
    where: { id: props.postId },
    data: {
      comment_count: { increment: 1 },
    },
  });
  // 6. Return transformed response
  return await CommunityCommentTransformer.transform(created);
}
