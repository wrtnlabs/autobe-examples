import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorPostsPostIdImages(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IPageICommunityPlatformPostImage.ISummary> {
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  const images = await MyGlobal.prisma.community_platform_post_images.findMany({
    where: {
      community_platform_post_id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      image_url: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const data = images.map((img) => ({
    id: img.id,
    imageUrl: img.image_url,
    createdAt: img.created_at.toISOString() as unknown as string &
      tags.Format<"date-time">,
    updatedAt: img.updated_at.toISOString() as unknown as string &
      tags.Format<"date-time">,
    deletedAt:
      img.deleted_at === null
        ? null
        : (img.deleted_at.toISOString() as unknown as
            | (string & tags.Format<"date-time">)
            | null),
  }));
  return {
    data,
    pagination: {
      current: 1,
      limit: data.length,
      records: data.length,
      pages: data.length === 0 ? 0 : 1,
    },
  };
}
