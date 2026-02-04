import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentCollector } from "../collectors/CommunityPlatformCommentCollector";
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";

export async function postCommunityPlatformMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string;
  body: ICommunityPlatformComment.ICreate;
}): Promise<ICommunityPlatformComment> {
  // Validate post exists
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Use collector to transform API DTO to Prisma CreateInput
  const commentData = await CommunityPlatformCommentCollector.collect({
    body: props.body,
    communityPlatformMembers: { id: props.member.id },
    communityPlatformMemberSessions: { id: props.member.session_id },
  });
  // Use transaction to ensure atomic operations
  const result = await MyGlobal.prisma.$transaction([
    // Create comment
    MyGlobal.prisma.community_platform_comments.create({
      data: commentData,
    }),
    // Increment post comment count
    MyGlobal.prisma.community_platform_posts.update({
      where: { id: props.postId },
      data: { comment_count: { increment: 1 } },
    }),
    // Create implicit upvote
    MyGlobal.prisma.community_platform_comment_votes.create({
      data: {
        id: v4(),
        comment: { connect: { id: commentData.id } },
        writer: { connect: { id: props.member.id } }, // Fixed: using 'writer' instead of 'member' as per schema
        value: 1,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    }),
    // Increment member karma
    MyGlobal.prisma.community_platform_members.update({
      where: { id: props.member.id },
      data: { karma: { increment: 1 } },
    }),
  ]);
  // Return the created comment using transformer - include parent relation in select
  const commentSelectType = CommunityPlatformCommentTransformer.select();
  const createdComment =
    result[0] as Prisma.community_platform_commentsGetPayload<
      typeof commentSelectType
    >;
  // The transformer handles the mapping from database fields to API structure
  // including parent_id -> parent, etc. No manual transformation needed.
  return await CommunityPlatformCommentTransformer.transform(createdComment);
}
