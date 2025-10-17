import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function putRedditCommunityCommunityModeratorRedditCommunityCommunityModeratorsId(props: {
  communityModerator: CommunitymoderatorPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityCommunityModerator.IUpdate;
}): Promise<IRedditCommunityCommunityModerator> {
  const { id, body } = props;

  await MyGlobal.prisma.reddit_community_community_moderators.findUniqueOrThrow(
    { where: { id } },
  );

  const moderator =
    await MyGlobal.prisma.reddit_community_community_moderators.update({
      where: { id },
      data: {
        assigned_at: body.assigned_at,
        updated_at: body.updated_at,
      },
      select: {
        id: true,
        member_id: true,
        assigned_at: true,
        created_at: true,
        updated_at: true,
      },
    });

  const member =
    await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow({
      where: { id: moderator.member_id },
    });

  return {
    id: moderator.id,
    email: member.email,
    is_email_verified: member.is_email_verified,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
  };
}
