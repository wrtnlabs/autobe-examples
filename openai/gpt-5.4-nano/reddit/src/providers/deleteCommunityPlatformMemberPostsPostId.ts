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

export async function deleteCommunityPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.community_platform_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_id: true,
      author_id: true,
    },
  });
  const isAuthor = post.author_id === props.member.id;
  const isModerator = isAuthor
    ? true
    : await MyGlobal.prisma.community_platform_community_moderators
        .findFirst({
          where: {
            community_id: post.community_id,
            moderator_user_id: props.member.id,
            deleted_at: null,
          },
          select: { id: true },
        })
        .then((m) => m !== null);
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.community_platform_posts.delete({
      where: { id: props.postId },
    });
  });
}
