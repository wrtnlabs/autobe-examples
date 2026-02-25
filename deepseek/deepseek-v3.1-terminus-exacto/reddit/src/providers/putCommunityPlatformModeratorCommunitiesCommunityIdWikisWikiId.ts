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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityWikiTransformer } from "../transformers/CommunityPlatformCommunityWikiTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformModeratorCommunitiesCommunityIdWikisWikiId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  wikiId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityWiki.IUpdate;
}): Promise<ICommunityPlatformCommunityWiki> {
  // Verify moderator has active assignment for this community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        user_id: props.moderator.id,
        community_id: props.communityId,
        is_active: true,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!moderatorAssignment) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if wiki exists and validate ownership
  const existingWiki =
    await MyGlobal.prisma.community_platform_community_wikis.findFirst({
      where: {
        id: props.wikiId,
        community_platform_community_id: props.communityId,
      },
      select: { id: true, deleted_at: true },
    });
  if (!existingWiki) {
    throw new HttpException("Wiki not found", 404);
  }
  // Check slug uniqueness if slug is being updated
  if (props.body.slug !== undefined) {
    const existingSlug =
      await MyGlobal.prisma.community_platform_community_wikis.findFirst({
        where: {
          community_platform_community_id: props.communityId,
          slug: props.body.slug,
          id: { not: props.wikiId },
          deleted_at: null,
        },
        select: { id: true },
      });
    if (existingSlug) {
      throw new HttpException("Slug already exists in this community", 409);
    }
  }
  // Prepare update data with proper typing
  const updateData: Prisma.community_platform_community_wikisUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.slug !== undefined) {
    updateData.slug = props.body.slug;
  }
  if (props.body.content !== undefined) {
    updateData.content = props.body.content;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  // Update wiki with transformer select
  const updatedWiki =
    await MyGlobal.prisma.community_platform_community_wikis.update({
      where: { id: props.wikiId },
      data: updateData,
      ...CommunityPlatformCommunityWikiTransformer.select(),
    });
  return await CommunityPlatformCommunityWikiTransformer.transform(updatedWiki);
}
