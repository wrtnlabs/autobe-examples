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

export async function deleteCommunityPlatformMemberPostsPostIdTextsTextId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  textId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_platform_member_id: true,
        post_type: true,
      },
    },
  );
  if (post.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (post.post_type !== "text") {
    throw new HttpException("Invalid post type", 400);
  }
  const text =
    await MyGlobal.prisma.community_platform_post_texts.findUniqueOrThrow({
      where: { id: props.textId },
      select: {
        id: true,
        community_platform_post_id: true,
      },
    });
  if (text.community_platform_post_id !== props.postId) {
    throw new HttpException(
      "Post text does not belong to the specified post",
      404,
    );
  }
  await MyGlobal.prisma.community_platform_post_texts.delete({
    where: { id: props.textId },
  });
}
