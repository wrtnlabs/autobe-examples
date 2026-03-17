import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IUpdate;
}): Promise<ICommunityPlatformComment> {
  const post = await MyGlobal.prisma.community_platform_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_platform_community_id: true,
    },
  });
  const comment =
    await MyGlobal.prisma.community_platform_comments.findFirstOrThrow({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
      select: {
        id: true,
        community_platform_post_id: true,
        community_platform_member_id: true,
        status: true,
      },
    });
  if (comment.community_platform_post_id !== props.postId) {
    throw new HttpException("Not Found", 404);
  }
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: post.community_platform_community_id,
        community_platform_member_id: props.member.id,
        status: "active",
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const canModerate = moderator !== null;
  const isAuthor = comment.community_platform_member_id === props.member.id;
  if (isAuthor === false && canModerate === false) {
    throw new HttpException("Forbidden", 403);
  }
  if (canModerate === false) {
    const banned =
      await MyGlobal.prisma.community_platform_community_bans.findFirst({
        where: {
          community_platform_community_id: post.community_platform_community_id,
          community_platform_member_id: props.member.id,
          status: "active",
          deleted_at: null,
          lifted_at: null,
          OR: [{ expired_at: null }, { expired_at: { gt: new Date() } }],
        },
        select: {
          id: true,
        },
      });
    if (banned !== null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  if (props.body.status !== undefined && canModerate === false) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_platform_comments.update({
      where: {
        id: props.commentId,
      },
      data: {
        ...(props.body.body !== undefined ? { body: props.body.body } : {}),
        ...(props.body.status !== undefined
          ? { status: props.body.status }
          : {}),
        updated_at: new Date(),
      },
      select: {
        id: true,
      },
    }),
  ]);
  return {};
}
