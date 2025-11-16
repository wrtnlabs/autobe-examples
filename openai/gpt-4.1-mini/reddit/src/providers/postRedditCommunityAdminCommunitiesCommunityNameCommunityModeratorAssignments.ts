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

export async function postRedditCommunityAdminCommunitiesCommunityNameCommunityModeratorAssignments(props: {
  admin: AdminPayload;
  communityName: string;
  body: IRedditCommunityCommunityModeratorAssignment.ICreate & {
    community_id: string & tags.Format<"uuid">;
  };
}): Promise<IRedditCommunityCommunityModeratorAssignment> {
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const id: string & tags.Format<"uuid"> = v4() satisfies string as string;

  const created =
    await MyGlobal.prisma.reddit_community_community_moderator_assignments.create(
      {
        data: {
          id: id,
          community_id: props.body.community_id,
          community_moderator_id: props.body.community_moderator_id,
          created_at: createdAt,
          updated_at: createdAt,
        },
      },
    );

  return {
    id: id,
    community_moderator_id: created.community_moderator_id,
    community_name: props.communityName,
    role: props.body.role,
    created_at: createdAt,
    updated_at: createdAt,
  };
}
