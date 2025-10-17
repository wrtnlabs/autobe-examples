import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditCommunityAdminCommunitiesCommunityIdCommunityModerators(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommunityModerator.ICreate;
}): Promise<void> {
  const { admin, communityId, body } = props;

  // Verify that the member exists
  const member = await MyGlobal.prisma.reddit_community_members.findUnique({
    where: { id: body.member_id },
  });
  if (member === null) {
    throw new HttpException("Member not found", 404);
  }

  // Verify that the community exists
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: communityId },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }

  // Check if the moderator assignment already exists
  const existingAssignment =
    await MyGlobal.prisma.reddit_community_community_moderators.findUnique({
      where: {
        member_id_community_id: {
          member_id: body.member_id,
          community_id: communityId,
        },
      },
    });
  if (existingAssignment !== null) {
    throw new HttpException("Moderator assignment already exists", 409);
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.reddit_community_community_moderators.create({
    data: {
      id: v4(),
      member_id: body.member_id,
      community_id: communityId,
      assigned_at: body.assigned_at,
      created_at: now,
      updated_at: now,
    },
  });
}
