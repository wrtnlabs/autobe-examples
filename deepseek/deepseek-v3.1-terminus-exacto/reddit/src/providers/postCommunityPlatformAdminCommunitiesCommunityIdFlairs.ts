import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityFlairCollector } from "../collectors/CommunityPlatformCommunityFlairCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityFlairTransformer } from "../transformers/CommunityPlatformCommunityFlairTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminCommunitiesCommunityIdFlairs(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityFlair.ICreate;
}): Promise<ICommunityPlatformCommunityFlair> {
  // Verify community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  // Check if flair with same display_text already exists in this community
  const existingFlair =
    await MyGlobal.prisma.community_platform_community_flairs.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        display_text: props.body.display_text,
        deleted_at: null,
      },
    });
  if (existingFlair) {
    throw new HttpException(
      "Flair with this display text already exists in this community",
      400,
    );
  }
  // Use collector to transform request body to database input
  const data = await CommunityPlatformCommunityFlairCollector.collect({
    body: props.body,
    communityPlatformCommunities: { id: props.communityId },
  });
  // Create flair record
  const created =
    await MyGlobal.prisma.community_platform_community_flairs.create({
      data,
      ...CommunityPlatformCommunityFlairTransformer.select(),
    });
  // Transform to response DTO
  return await CommunityPlatformCommunityFlairTransformer.transform(created);
}
