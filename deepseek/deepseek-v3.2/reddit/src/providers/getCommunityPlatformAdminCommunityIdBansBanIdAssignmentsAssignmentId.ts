import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformBanAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanAssignment";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformBanAssignmentTransformer } from "../transformers/CommunityPlatformBanAssignmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminCommunityIdBansBanIdAssignmentsAssignmentId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformBanAssignment> {
  // 1. Validate community exists and is not deleted
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    } satisfies Prisma.community_platform_communitiesWhereUniqueInput,
    select: { id: true },
  });
  // 2. Validate ban exists in this community, is active, and not deleted
  await MyGlobal.prisma.community_platform_bans.findUniqueOrThrow({
    where: {
      id: props.banId,
      community_id: props.communityId,
      active: true,
      deleted_at: null,
    } satisfies Prisma.community_platform_bansWhereUniqueInput,
    select: { id: true },
  });
  // 3. Retrieve assignment with transformer select
  // Admin can see both active and soft-deleted assignments
  const assignment =
    await MyGlobal.prisma.community_platform_ban_assignments.findUniqueOrThrow({
      where: {
        id: props.assignmentId,
        community_platform_ban_id: props.banId,
        // Allow admin to see both active and soft-deleted assignments
      } satisfies Prisma.community_platform_ban_assignmentsWhereUniqueInput,
      ...CommunityPlatformBanAssignmentTransformer.select(),
    });
  // 4. Transform and return
  return await CommunityPlatformBanAssignmentTransformer.transform(assignment);
}
