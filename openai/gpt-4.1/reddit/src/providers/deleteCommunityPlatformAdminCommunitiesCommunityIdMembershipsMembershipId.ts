import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminCommunitiesCommunityIdMembershipsMembershipId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the membership and validate it belongs to the specified community
  const membership =
    await MyGlobal.prisma.community_platform_community_memberships.findUnique({
      where: { id: props.membershipId },
    });
  if (
    !membership ||
    membership.community_platform_community_id !== props.communityId
  ) {
    throw new HttpException("Membership not found", 404);
  }
  // Hard delete the membership
  await MyGlobal.prisma.community_platform_community_memberships.delete({
    where: { id: props.membershipId },
  });
}
