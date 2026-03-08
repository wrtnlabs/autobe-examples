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

export async function deleteCommunityPlatformMemberPostsPostIdImagesFileId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify post exists and is not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: { id: true, author_id: true, deleted_at: true },
    },
  );
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // 2. Verify authorization - member must be the author
  if (post.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify image association exists for this post
  await MyGlobal.prisma.community_platform_post_images.findFirstOrThrow({
    where: {
      community_platform_post_id: props.postId,
      community_platform_file_id: props.fileId,
    },
    select: { id: true },
  });
  // 4. Delete the junction record and soft-delete the file
  const now = new Date().toISOString();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_platform_post_images.deleteMany({
      where: {
        community_platform_post_id: props.postId,
        community_platform_file_id: props.fileId,
      },
    }),
    MyGlobal.prisma.community_platform_files.update({
      where: { id: props.fileId },
      data: { deleted_at: now },
    }),
  ]);
}
