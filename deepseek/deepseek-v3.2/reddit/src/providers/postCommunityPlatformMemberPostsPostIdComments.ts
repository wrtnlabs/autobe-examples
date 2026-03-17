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
  // Validate post exists and get community
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_platform_community_id: true,
        deleted_at: true,
      },
    },
  );
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Check ban status
  const ban = await MyGlobal.prisma.community_platform_bans.findFirst({
    where: {
      member_id: props.member.id,
      community_id: post.community_platform_community_id,
      active: true,
      deleted_at: null,
    },
  });
  if (ban !== null) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate parent comment if provided
  if (
    props.body.parentCommentId !== undefined &&
    props.body.parentCommentId !== null
  ) {
    const parent = await MyGlobal.prisma.community_platform_comments.findUnique(
      {
        where: { id: props.body.parentCommentId },
        select: { id: true, post_id: true, deleted_at: true },
      },
    );
    if (
      parent === null ||
      parent.deleted_at !== null ||
      parent.post_id !== post.id
    ) {
      throw new HttpException("Invalid parent comment", 400);
    }
  }
  // Create comment
  const comment = await MyGlobal.prisma.community_platform_comments.create({
    data: await CommunityPlatformCommentCollector.collect({
      body: props.body,
      author: { id: props.member.id },
      post: { id: post.id },
    }),
    ...CommunityPlatformCommentTransformer.select(),
  });
  return await CommunityPlatformCommentTransformer.transform(comment);
}
