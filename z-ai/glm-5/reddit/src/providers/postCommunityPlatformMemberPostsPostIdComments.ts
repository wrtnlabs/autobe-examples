import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentCollector } from "../collectors/CommunityPlatformCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.ICreate;
}): Promise<ICommunityPlatformComment> {
  // Validate post exists and get community_id for ban check
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: {
        id: props.postId,
        deleted_at: null,
      },
      select: {
        id: true,
        community_id: true,
        comment_count: true,
      },
    },
  );
  // Check if member is banned from the community
  const ban = await MyGlobal.prisma.community_platform_community_bans.findFirst(
    {
      where: {
        community_id: post.community_id,
        banned_user_id: props.member.id,
        deleted_at: null,
      },
    },
  );
  if (ban !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Create comment and increment comment_count in transaction
  const comment = await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.community_platform_comments.create({
      data: await CommunityPlatformCommentCollector.collect({
        body: props.body,
        communityPlatformPosts: { id: props.postId },
        communityPlatformMembers: { id: props.member.id },
        communityPlatformMemberSessions: { id: props.member.session_id },
      }),
      ...CommunityPlatformCommentTransformer.select(),
    });
    await tx.community_platform_posts.update({
      where: { id: props.postId },
      data: {
        comment_count: post.comment_count + 1,
      },
    });
    return created;
  });
  return await CommunityPlatformCommentTransformer.transform(comment);
}
