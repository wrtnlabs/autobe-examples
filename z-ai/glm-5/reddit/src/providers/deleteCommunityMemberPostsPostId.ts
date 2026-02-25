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

export async function deleteCommunityMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.community_posts.findUnique({
    where: { id: props.postId },
    select: {
      author_id: true,
      is_deleted: true,
      vote_score: true,
    },
  });
  if (post === null) {
    throw new HttpException("Post not found", 404);
  }
  if (post.is_deleted) {
    throw new HttpException("Post has already been deleted", 410);
  }
  if (post.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_posts.update({
      where: { id: props.postId },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.community_members.update({
      where: { id: post.author_id },
      data: {
        karma: { decrement: post.vote_score },
        updated_at: new Date(),
      },
    }),
  ]);
}
