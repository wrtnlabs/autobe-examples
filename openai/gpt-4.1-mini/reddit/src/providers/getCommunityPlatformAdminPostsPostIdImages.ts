import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformPostImageTransformer } from "../transformers/CommunityPlatformPostImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminPostsPostIdImages(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostImage[]> {
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  const images = await MyGlobal.prisma.community_platform_post_images.findMany({
    where: { community_platform_post_id: props.postId, deleted_at: null },
    ...CommunityPlatformPostImageTransformer.select(),
  });
  return await Promise.all(
    images.map((img) => CommunityPlatformPostImageTransformer.transform(img)),
  );
}
