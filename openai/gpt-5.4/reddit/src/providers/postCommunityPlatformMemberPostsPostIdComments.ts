import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.ICreate;
}): Promise<ICommunityPlatformComment> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_platform_community_id: true,
        status: true,
        deleted_at: true,
      },
    },
  );
  if (
    post.deleted_at !== null ||
    post.status === "deleted" ||
    post.status === "removed" ||
    post.status === "moderated" ||
    post.status === "hidden"
  ) {
    throw new HttpException("Post is not available for commenting", 409);
  }
  const now = toISOStringSafe(new Date());
  const banned =
    await MyGlobal.prisma.community_platform_community_bans.findFirst({
      where: {
        community_platform_community_id: post.community_platform_community_id,
        community_platform_member_id: props.member.id,
        deleted_at: null,
        status: "active",
        started_at: { lte: now },
        OR: [{ expired_at: null }, { expired_at: { gt: now } }],
        lifted_at: null,
      },
      select: { id: true },
    });
  if (banned !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.parentId !== undefined && props.body.parentId !== null) {
    const parent =
      await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
        where: { id: props.body.parentId },
        select: {
          id: true,
          community_platform_post_id: true,
          status: true,
          deleted_at: true,
        },
      });
    if (parent.community_platform_post_id !== props.postId) {
      throw new HttpException(
        "Parent comment does not belong to the target post",
        400,
      );
    }
    if (
      parent.deleted_at !== null ||
      parent.status === "deleted" ||
      parent.status === "removed" ||
      parent.status === "moderated" ||
      parent.status === "hidden"
    ) {
      throw new HttpException("Parent comment is not available for reply", 409);
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_comments.create({
      data: await CommunityPlatformCommentCollector.collect({
        body: props.body,
        communityPlatformPost: { id: post.id },
        member: { id: props.member.id },
      }),
      select: {
        id: true,
      },
    });
  });
  return {};
}
