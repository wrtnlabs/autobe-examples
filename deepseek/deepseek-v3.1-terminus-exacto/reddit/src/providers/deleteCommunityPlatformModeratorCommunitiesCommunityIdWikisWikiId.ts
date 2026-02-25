import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteCommunityPlatformModeratorCommunitiesCommunityIdWikisWikiId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  wikiId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify community exists and get owner information
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId, deleted_at: null },
    });
  // Check if moderator is authorized (either owner or assigned moderator)
  const isOwner = community.owner_user_id === props.moderator.id;
  if (!isOwner) {
    const moderatorAssignment =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          user_id: props.moderator.id,
          community_id: props.communityId,
          is_active: true,
          deleted_at: null,
        },
      });
    if (!moderatorAssignment) {
      throw new HttpException(
        "You do not have permission to delete wiki pages in this community",
        403,
      );
    }
  }
  // Verify wiki page exists and belongs to the specified community
  const wikiPage =
    await MyGlobal.prisma.community_platform_community_wikis.findUniqueOrThrow({
      where: { id: props.wikiId },
    });
  if (wikiPage.community_platform_community_id !== props.communityId) {
    throw new HttpException(
      "Wiki page not found in the specified community",
      404,
    );
  }
  // Perform cascade deletion - database handles related records automatically
  await MyGlobal.prisma.community_platform_community_wikis.delete({
    where: { id: props.wikiId },
  });
}
