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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberComments(props: {
  member: MemberPayload;
  body: ICommunityPlatformComment.ICreate;
}): Promise<ICommunityPlatformComment> {
  if (props.body.content.trim().length === 0) {
    throw new HttpException("Comment content is required", 400);
  }
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: {
        id: props.body.community_platform_post_id,
      },
      select: {
        id: true,
        community_platform_community_id: true,
        status: true,
      },
    },
  );
  if (post.status !== "active") {
    throw new HttpException("Post is not available for commenting", 400);
  }
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findFirst({
      where: {
        community_platform_community_id: post.community_platform_community_id,
        community_platform_member_id: props.member.id,
      },
      select: {
        id: true,
      },
    });
  if (subscription === null) {
    throw new HttpException("Forbidden", 403);
  }
  const parentId: string | null = props.body.parent_id ?? null;
  if (parentId !== null) {
    const parent =
      await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
        where: {
          id: parentId,
        },
        select: {
          id: true,
          community_platform_post_id: true,
          deleted_at: true,
        },
      });
    if (parent.deleted_at !== null) {
      throw new HttpException("Parent comment is not available", 400);
    }
    if (parent.community_platform_post_id !== post.id) {
      throw new HttpException(
        "Parent comment does not belong to the target post",
        400,
      );
    }
  }
  const created = await MyGlobal.prisma.community_platform_comments.create({
    data: {
      id: v4(),
      community_platform_post_id: post.id,
      community_platform_member_id: props.member.id,
      parent_id: parentId,
      content: props.body.content.trim(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...CommunityPlatformCommentTransformer.select(),
  });
  return CommunityPlatformCommentTransformer.transform(created);
}
