import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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
import { CommunityPlatformCommunityModeratorAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorCommunitiesCommunityIdModerators(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModerator.IUpdate;
}): Promise<ICommunityPlatformCommunityModerator.ISummary> {
  // Check if the current moderator has a role in the specific community
  const existingModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        community_moderator_id: props.moderator.id,
        deleted_at: null,
      },
      select: { role: true },
    });
  if (!existingModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Only owner can assign the 'owner' role
  if (props.body.role === "owner" && existingModerator.role !== "owner") {
    throw new HttpException("Forbidden: only owner can assign owner role", 403);
  }
  // communityModeratorId must be provided in the body
  if (typeof props.body.communityModeratorId !== "string") {
    throw new HttpException("communityModeratorId is required", 400);
  }
  const communityModeratorId = typia.assert<string & tags.Format<"uuid">>(
    props.body.communityModeratorId,
  );
  // Verify that the target moderator exists
  const targetModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findUnique({
      where: { id: communityModeratorId as string },
      select: { role: true },
    });
  if (!targetModerator) {
    throw new HttpException("Moderator not found", 404);
  }
  // Cannot demote or remove an owner accidentally
  if (targetModerator.role === "owner" && props.body.role !== "owner") {
    throw new HttpException("Cannot remove or demote owner role", 403);
  }
  // Update the role of the target moderator
  await MyGlobal.prisma.community_platform_community_moderators.update({
    where: { id: communityModeratorId as string },
    data: {
      role: props.body.role ?? undefined,
      updated_at: new Date().toISOString(),
    },
  });
  // Retrieve the updated record with appropriate select fields
  const updatedRecord =
    await MyGlobal.prisma.community_platform_community_moderators.findUniqueOrThrow(
      {
        where: { id: communityModeratorId as string },
        ...CommunityPlatformCommunityModeratorAtSummaryTransformer.select(),
      },
    );
  // Transform and return the updated record
  return await CommunityPlatformCommunityModeratorAtSummaryTransformer.transform(
    updatedRecord,
  );
}
