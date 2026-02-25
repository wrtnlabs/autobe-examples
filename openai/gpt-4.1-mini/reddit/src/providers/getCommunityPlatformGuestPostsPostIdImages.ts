import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { CommunityPlatformPostImageTransformer } from "../transformers/CommunityPlatformPostImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformGuestPostsPostIdImages(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostImage[]> {
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  const records = await MyGlobal.prisma.community_platform_post_images.findMany(
    {
      where: { community_platform_post_id: props.postId },
      ...CommunityPlatformPostImageTransformer.select(),
    },
  );
  return await Promise.all(
    records.map(CommunityPlatformPostImageTransformer.transform),
  );
}
