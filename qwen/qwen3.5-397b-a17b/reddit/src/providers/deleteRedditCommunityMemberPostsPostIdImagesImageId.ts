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

export async function deleteRedditCommunityMemberPostsPostIdImagesImageId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      reddit_community_member_id: true,
    },
  });
  if (post.reddit_community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const image =
    await MyGlobal.prisma.reddit_community_post_images.findUniqueOrThrow({
      where: {
        id: props.imageId,
        reddit_community_post_id: props.postId,
        deleted_at: null,
      },
      select: {
        id: true,
        file_path: true,
      },
    });
  await MyGlobal.prisma.reddit_community_post_images.update({
    where: {
      id: props.imageId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
