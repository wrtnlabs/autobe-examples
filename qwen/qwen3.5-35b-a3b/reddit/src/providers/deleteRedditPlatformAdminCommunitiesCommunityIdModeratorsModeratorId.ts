import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditPlatformAdminCommunitiesCommunityIdModeratorsModeratorId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify community exists
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  // Step 2: Verify authenticated admin is the owner
  if (community.owner_id !== props.admin.id) {
    throw new HttpException(
      "Only the community owner can remove moderators",
      403,
    );
  }
  // Step 3: Delete the moderator record
  await MyGlobal.prisma.reddit_platform_community_moderators.delete({
    where: {
      community_id_user_id: {
        community_id: props.communityId,
        user_id: props.moderatorId,
      },
    },
  });
}
