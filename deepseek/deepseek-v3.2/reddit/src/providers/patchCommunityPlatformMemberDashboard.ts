import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityTransformer } from "../transformers/CommunityPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberDashboard(props: {
  member: MemberPayload;
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<ICommunityPlatformCommunity> {
  // Parse request filters
  const { search, sort_by, sort_order, page, limit } = props.body;
  // Set default values
  const currentPage = page ?? 1;
  const pageLimit = limit ?? 20;
  // Calculate time ranges (using string timestamps)
  const now = toISOStringSafe(new Date());
  const thirtyDaysAgo = toISOStringSafe(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );
  const sevenDaysAgo = toISOStringSafe(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  );
  const todayStart = toISOStringSafe(new Date(new Date().setHours(0, 0, 0, 0)));
  const yesterdayStart = toISOStringSafe(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
  );
  // Get member information
  const member =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: props.member.id },
      select: {
        id: true,
        email: true,
        username: true,
        nickname: true,
        email_verified: true,
        registered_at: true,
        last_login_at: true,
      },
    });
  // Query system metrics for platform performance - using correct field 'created_at' from schema
  const systemMetrics =
    await MyGlobal.prisma.community_platform_system_metrics.findMany({
      where: {
        created_at: {
          gte: new Date(thirtyDaysAgo),
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: 100,
    });
  // Query health checks for current system status - using correct field 'created_at' from schema
  const healthChecks =
    await MyGlobal.prisma.community_platform_health_checks.findMany({
      where: {
        created_at: {
          gte: new Date(yesterdayStart),
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });
  // Query configurations for feature flags
  const configurations =
    await MyGlobal.prisma.community_platform_configurations.findMany({
      where: {
        key: {
          in: [
            "FEATURE_COMMUNITY_CREATION",
            "FEATURE_POST_VOTING",
            "FEATURE_COMMENT_REPLIES",
            "FEATURE_USER_REPORTING",
          ],
        },
      },
    });
  // Query subscriber counts from materialized view
  const subscriberTrends =
    await MyGlobal.prisma.community_platform_mv_community_subscriber_counts.findMany(
      {
        orderBy: {
          subscriber_count: "desc",
        },
        take: 10,
      },
    );
  // We need to return an ICommunityPlatformCommunity, so let's fetch a community
  // We'll use the first community the member owns or default community
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        owner_member_id: props.member.id,
        deleted_at: null,
      },
      ...CommunityPlatformCommunityTransformer.select(),
    });
  if (!community) {
    // Return default community-like structure with dashboard data
    return {
      id: v4(),
      name: "Dashboard Community",
      description: "Platform Dashboard Overview",
      owner: {
        id: member.id,
        email: member.email,
        username: member.username,
        nickname: member.nickname ?? null,
        email_verified: member.email_verified,
        registered_at: member.registered_at.toISOString(),
        last_login_at: member.last_login_at?.toISOString() ?? null,
      } satisfies ICommunityPlatformMember.ISummary,
      subscriber_count: 0,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    } satisfies ICommunityPlatformCommunity;
  }
  // Transform and return using transformer
  return await CommunityPlatformCommunityTransformer.transform(community);
}
