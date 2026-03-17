import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCloneMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the requesting member is the community owner
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { owner_id: true },
    });
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify the moderator record exists and is not the owner
  const moderator =
    await MyGlobal.prisma.reddit_clone_moderators.findUniqueOrThrow({
      where: {
        id: props.moderatorId,
        community_id: props.communityId,
        deleted_at: null,
      },
      select: { is_owner: true },
    });
  if (moderator.is_owner) {
    throw new HttpException("Cannot remove the community owner", 403);
  }
  // Perform soft delete
  await MyGlobal.prisma.reddit_clone_moderators.update({
    where: { id: props.moderatorId },
    data: {
      deleted_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
}
