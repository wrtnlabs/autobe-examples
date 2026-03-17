import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityImageTransformer } from "../transformers/CommunityPlatformCommunityImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformCommunityIdImagesImageId(props: {
  communityId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityImage> {
  // Verify community exists first
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Retrieve the image with community filter
  const image =
    await MyGlobal.prisma.community_platform_community_images.findUniqueOrThrow(
      {
        where: {
          id: props.imageId,
          community_id: props.communityId,
        },
        ...CommunityPlatformCommunityImageTransformer.select(),
      },
    );
  // Transform to DTO format
  return await CommunityPlatformCommunityImageTransformer.transform(image);
}
