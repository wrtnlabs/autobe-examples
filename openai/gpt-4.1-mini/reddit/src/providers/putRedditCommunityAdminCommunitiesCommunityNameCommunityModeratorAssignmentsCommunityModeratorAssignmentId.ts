import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModeratorAssignment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminCommunitiesCommunityNameCommunityModeratorAssignmentsCommunityModeratorAssignmentId(props: {
  admin: AdminPayload;
  communityName: string;
  communityModeratorAssignmentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommunityModeratorAssignment.IUpdate;
}): Promise<IRedditCommunityCommunityModeratorAssignment> {
  const existing =
    await MyGlobal.prisma.reddit_community_community_moderator_assignments.findUnique(
      {
        where: { id: props.communityModeratorAssignmentId },
      },
    );
  if (!existing) {
    throw new HttpException("Community moderator assignment not found", 404);
  }
  const updated =
    await MyGlobal.prisma.reddit_community_community_moderator_assignments.update(
      {
        where: { id: props.communityModeratorAssignmentId },
        data: {
          ...props.body,
          updated_at: props.body.updated_at ?? toISOStringSafe(new Date()),
        },
      },
    );
  return {
    id: updated.id,
    community_moderator_id: updated.community_moderator_id,
    community_name: props.communityName,
    role: props.body.role ?? "",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
