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

export async function deleteCommunityMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify community exists and is not deleted
  await MyGlobal.prisma.community_communities.findFirstOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Verify requesting member holds 'owner' role in this community
  const ownerRecord = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: props.communityId,
      member_id: props.member.id,
      role: "owner",
    },
    select: { id: true },
  });
  if (ownerRecord === null) {
    throw new HttpException(
      "Forbidden: only the community owner can remove moderators",
      403,
    );
  }
  // Step 3: Load the target moderator record (must belong to this community)
  const targetRecord =
    await MyGlobal.prisma.community_moderators.findFirstOrThrow({
      where: {
        id: props.moderatorId,
        community_id: props.communityId,
      },
      select: { id: true, role: true },
    });
  // Step 4: Prevent removing the owner record
  if (targetRecord.role === "owner") {
    throw new HttpException("Forbidden: the owner role cannot be removed", 403);
  }
  // Step 5: Hard delete the moderator record
  await MyGlobal.prisma.community_moderators.delete({
    where: { id: props.moderatorId },
  });
}
