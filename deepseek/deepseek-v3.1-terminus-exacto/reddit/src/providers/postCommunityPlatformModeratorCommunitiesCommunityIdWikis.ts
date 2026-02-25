import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityWiki } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityWiki";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityWikiCollector } from "../collectors/CommunityPlatformCommunityWikiCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityWikiTransformer } from "../transformers/CommunityPlatformCommunityWikiTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorCommunitiesCommunityIdWikis(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityWiki.ICreate;
}): Promise<ICommunityPlatformCommunityWiki> {
  // Verify community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  // Check if moderator is assigned to this community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        id: props.moderator.id,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "You are not authorized to create wiki pages in this community",
      403,
    );
  }
  // Check slug uniqueness within the community
  const existingWiki =
    await MyGlobal.prisma.community_platform_community_wikis.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        slug: props.body.slug,
        deleted_at: null,
      },
    });
  if (existingWiki) {
    throw new HttpException(
      "A wiki page with this slug already exists in the community",
      400,
    );
  }
  // Use collector to transform request body to database input
  const wikiData = await CommunityPlatformCommunityWikiCollector.collect({
    body: props.body,
    communityPlatformCommunities: { id: props.communityId },
    communityPlatformUsers: { id: props.moderator.id },
  });
  // Create the wiki page
  const createdWiki =
    await MyGlobal.prisma.community_platform_community_wikis.create({
      data: wikiData,
      ...CommunityPlatformCommunityWikiTransformer.select(),
    });
  // Transform database record to response DTO
  return await CommunityPlatformCommunityWikiTransformer.transform(createdWiki);
}
