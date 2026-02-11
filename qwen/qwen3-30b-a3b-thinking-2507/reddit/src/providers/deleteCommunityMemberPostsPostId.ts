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
    where: { id: props.postId, deleted_at: null },
    select: { author_id: true, community_id: true },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  if (post.author_id !== props.member.id) {
    throw new HttpException("You are not the author of this post", 403);
  }
  const community = await MyGlobal.prisma.community_communities.findUnique({
    where: { id: post.community_id, deleted_at: null },
    select: { owner_id: true },
  });
  if (!community || community.owner_id !== props.member.id) {
    throw new HttpException("You are not authorized to delete this post", 403);
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_comments.deleteMany({
      where: { post_id: props.postId },
    }),
    MyGlobal.prisma.community_posts.delete({
      where: { id: props.postId },
    }),
  ]);
}
