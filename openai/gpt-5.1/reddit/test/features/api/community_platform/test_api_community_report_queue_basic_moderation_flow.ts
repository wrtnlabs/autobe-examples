import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityReport";

export async function test_api_community_report_queue_basic_moderation_flow(
  connection: api.IConnection,
) {
  // 1. Register admin user (join)
  const adminUsername = RandomGenerator.alphabets(10);
  const adminEmail = `${RandomGenerator.alphabets(8)}@admin.example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. Register member user (join)
  const memberUsername = RandomGenerator.alphabets(10);
  const memberEmail = `${RandomGenerator.alphabets(8)}@member.example.com`;
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoin);

  // 3. As member, create community
  const communitySlug = `community-${RandomGenerator.alphabets(8)}`;
  const communityName = `Community ${RandomGenerator.name(2)}`;

  const communityCreateBody = {
    slug: communitySlug,
    name: communityName,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. As member, create membership in that community
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 5. As member, create community-level report targeting that community
  const communityReportCreateBody = {
    community_id: community.id,
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityReport.ICreate;

  const createdReport: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      {
        body: communityReportCreateBody,
      },
    );
  typia.assert(createdReport);

  // 6. Switch back to admin context by logging in
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 7. As admin, fetch community report queue with filters
  const queueRequestBody = {
    page: 1,
    limit: 10,
    status: null,
    reason_category: null,
    community_id: community.id,
    reporter_memberuser_id: memberJoin.id,
    created_from: null,
    created_to: null,
    order_by: null,
    order_direction: null,
    search: null,
  } satisfies ICommunityPlatformCommunityReport.IRequest;

  const queue: IPageICommunityPlatformCommunityReport.ISummary =
    await api.functional.communityPlatform.adminUser.reports.queues.community.index(
      connection,
      {
        body: queueRequestBody,
      },
    );
  typia.assert(queue);

  // 8. Validate pagination basics
  const pagination = queue.pagination;
  TestValidator.predicate(
    "pagination.records should be at least 1",
    pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination.limit should be at least 1",
    pagination.limit >= 1,
  );

  TestValidator.predicate(
    "data length should be at least 1",
    queue.data.length >= 1,
  );

  // 9. Find matching report summary for created community and reporter
  const matched = queue.data.find((summary) => {
    return (
      summary.community.id === community.id &&
      summary.community.slug === community.slug &&
      summary.reporter.id === memberJoin.id
    );
  });

  TestValidator.predicate(
    "there should be at least one matching community report summary",
    matched !== undefined,
  );

  if (!matched) return;

  // Business semantic checks for the matched summary
  TestValidator.equals(
    "matched community id equals created community id",
    matched.community.id,
    community.id,
  );
  TestValidator.equals(
    "matched community slug equals created community slug",
    matched.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "matched reporter id equals member user id",
    matched.reporter.id,
    memberJoin.id,
  );

  TestValidator.predicate(
    "reason_category must be non-empty",
    matched.reason_category.length > 0,
  );

  TestValidator.predicate(
    "status must be non-empty",
    matched.status.length > 0,
  );
}
