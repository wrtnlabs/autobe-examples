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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityFlairTransformer } from "../transformers/CommunityPlatformCommunityFlairTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorCommunitiesCommunityIdFlairs(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityFlair.ICreate;
}): Promise<ICommunityPlatformCommunityFlair> {
  // Verify community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId, deleted_at: null },
    });
  // Verify moderator is assigned to this community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.moderator.id,
        deleted_at: null,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException("Forbidden", 403);
  }
  // Use collector to prepare create data
  const created =
    await MyGlobal.prisma.community_platform_community_flairs.create({
      data: await CommunityPlatformCommunityFlairCollector.collect({
        body: props.body,
        communityPlatformCommunities: community,
      }),
      ...CommunityPlatformCommunityFlairTransformer.select(),
    });
  // Transform to response DTO
  return await CommunityPlatformCommunityFlairTransformer.transform(created);
}
