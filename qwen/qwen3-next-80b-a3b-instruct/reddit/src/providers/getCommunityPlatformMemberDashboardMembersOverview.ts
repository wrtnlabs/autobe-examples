import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getCommunityPlatformMemberDashboardMembersOverview(props: {
  member: MemberPayload;
}): Promise<IPageICommunityPlatformMember.ISummary> {
  // Count total members (excluding deleted)
  const totalMembers = await MyGlobal.prisma.community_platform_members.count({
    where: { deleted_at: null },
  });
  // Count moderators (excluding deleted)
  const totalModerators =
    await MyGlobal.prisma.community_platform_moderators.count({
      where: { deleted_at: null },
    });
  // Count owners (excluding deleted)
  const totalOwners = await MyGlobal.prisma.community_platform_owners.count({
    where: { deleted_at: null },
  });
  // Total aggregated members (all roles)
  const totalCount = totalMembers + totalModerators + totalOwners;
  // For dashboard overview with empty summary objects, return a single page with minimal size
  // Since ICommunityPlatformMember.ISummary is {} (empty object) and no actual member data is returned,
  // data array should be empty since there's no data to return.
  // Pagination metadata is returned to comply with IPageICommunityPlatformMember.ISummary structure
  return {
    pagination: {
      current: 1,
      limit: 1,
      records: totalCount,
      pages: 1,
    },
    data: [] as ICommunityPlatformMember.ISummary[],
  };
}
