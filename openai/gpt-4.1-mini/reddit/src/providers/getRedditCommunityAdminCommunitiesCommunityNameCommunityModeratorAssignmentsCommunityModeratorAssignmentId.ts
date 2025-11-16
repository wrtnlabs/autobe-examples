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

export async function getRedditCommunityAdminCommunitiesCommunityNameCommunityModeratorAssignmentsCommunityModeratorAssignmentId(props: {
  admin: AdminPayload;
  communityName: string;
  communityModeratorAssignmentId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunityModeratorAssignment> {
  const record =
    await MyGlobal.prisma.reddit_community_community_moderator_assignments.findUnique(
      {
        where: { id: props.communityModeratorAssignmentId },
        select: {
          id: true,
          community_moderator_id: true,
          created_at: true,
          updated_at: true,
          community_id: true,
        },
      },
    );

  if (!record) {
    throw new HttpException("Community moderator assignment not found", 404);
  }

  // Note: role and community_name are not in schema, so use request param and default
  return {
    id: record.id,
    community_moderator_id: record.community_moderator_id,
    community_name: props.communityName,
    role: "member",
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
