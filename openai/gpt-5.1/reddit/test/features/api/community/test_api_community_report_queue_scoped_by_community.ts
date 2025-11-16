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

export async function test_api_community_report_queue_scoped_by_community(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an admin user
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass!1" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create and authenticate a member user
  const memberJoinBody = {
    username: RandomGenerator.name(1) as string &
      tags.MinLength<3> &
      tags.MaxLength<32>,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) as string & tags.MinLength<8>,
    ip: null,
    href: "https://client.app/join" as string & tags.Format<"uri">,
    referrer: "https://client.app/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Create two distinct communities as the member user
  const communityCreateBase = () =>
    ({
      slug: RandomGenerator.alphaNumeric(12) as string &
        tags.MinLength<1> &
        tags.MaxLength<128>,
      name: RandomGenerator.paragraph({ sentences: 2 }) as string &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      description: RandomGenerator.paragraph({ sentences: 5 }) as string &
        tags.MaxLength<4000>,
      visibility: "public",
      status: "active",
      is_nsfw: false,
      is_quarantined: false,
      is_posting_restricted: false,
      allow_text_posts: true,
      allow_link_posts: true,
      allow_image_posts: true,
    }) satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBase(),
      },
    );
  typia.assert(communityA);

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBase(),
      },
    );
  typia.assert(communityB);

  // 4. Join each community as the same member user
  const membershipBody = {
    role: "member",
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipA: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: communityA.slug,
        body: membershipBody,
      },
    );
  typia.assert(membershipA);

  const membershipB: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: communityB.slug,
        body: membershipBody,
      },
    );
  typia.assert(membershipB);

  // 5. File community-level reports for each community
  const reportForCommunityA1: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      {
        body: {
          community_id: communityA.id,
          reason_category: "spam",
          reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunityReport.ICreate,
      },
    );
  typia.assert(reportForCommunityA1);

  const reportForCommunityA2: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      {
        body: {
          community_id: communityA.id,
          reason_category: "abuse",
          reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunityReport.ICreate,
      },
    );
  typia.assert(reportForCommunityA2);

  const reportForCommunityB1: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      {
        body: {
          community_id: communityB.id,
          reason_category: "spam",
          reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunityReport.ICreate,
      },
    );
  typia.assert(reportForCommunityB1);

  const reportIdsForCommunityA: string[] = [
    reportForCommunityA1.id,
    reportForCommunityA2.id,
  ];
  const reportIdsForCommunityB: string[] = [reportForCommunityB1.id];

  // 6. Switch back to the admin user via login
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.app/login" as string & tags.Format<"uri">,
    referrer: "https://admin.app" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 7. Query the community report queue filtered to communityA
  const queueRequestForA = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    status: null,
    reason_category: null,
    community_id: communityA.id,
    reporter_memberuser_id: null,
    created_from: null,
    created_to: null,
    order_by: null,
    order_direction: null,
    search: null,
  } satisfies ICommunityPlatformCommunityReport.IRequest;

  const queueForA: IPageICommunityPlatformCommunityReport.ISummary =
    await api.functional.communityPlatform.adminUser.reports.queues.community.index(
      connection,
      {
        body: queueRequestForA,
      },
    );
  typia.assert(queueForA);

  // 8. Validate that all results belong to communityA and exclude communityB
  TestValidator.predicate(
    "queue for communityA should not be empty",
    queueForA.data.length > 0,
  );

  for (const summary of queueForA.data) {
    TestValidator.equals(
      "every report in queueForA has communityA id",
      summary.community.id,
      communityA.id,
    );
    TestValidator.predicate(
      "no report in queueForA belongs to communityB",
      summary.community.id !== communityB.id,
    );
  }

  // Every returned id should be among the created reports for communityA
  for (const summary of queueForA.data) {
    TestValidator.predicate(
      "queueForA item id must be from communityA-created set",
      reportIdsForCommunityA.includes(summary.id),
    );
    TestValidator.predicate(
      "queueForA item id must not be from communityB-created set",
      !reportIdsForCommunityB.includes(summary.id),
    );
  }

  // 9. Query the queue filtered to communityB
  const queueRequestForB = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    status: null,
    reason_category: null,
    community_id: communityB.id,
    reporter_memberuser_id: null,
    created_from: null,
    created_to: null,
    order_by: null,
    order_direction: null,
    search: null,
  } satisfies ICommunityPlatformCommunityReport.IRequest;

  const queueForB: IPageICommunityPlatformCommunityReport.ISummary =
    await api.functional.communityPlatform.adminUser.reports.queues.community.index(
      connection,
      {
        body: queueRequestForB,
      },
    );
  typia.assert(queueForB);

  TestValidator.predicate(
    "queue for communityB should not be empty",
    queueForB.data.length > 0,
  );

  for (const summary of queueForB.data) {
    TestValidator.equals(
      "every report in queueForB has communityB id",
      summary.community.id,
      communityB.id,
    );
    TestValidator.predicate(
      "no report in queueForB belongs to communityA",
      summary.community.id !== communityA.id,
    );
  }

  for (const summary of queueForB.data) {
    TestValidator.predicate(
      "queueForB item id must be from communityB-created set",
      reportIdsForCommunityB.includes(summary.id),
    );
    TestValidator.predicate(
      "queueForB item id must not be from communityA-created set",
      !reportIdsForCommunityA.includes(summary.id),
    );
  }

  // 10. Cross-compare result sets to ensure they differ by community
  TestValidator.predicate(
    "there is at least one communityA report id",
    reportIdsForCommunityA.length > 0,
  );
  TestValidator.predicate(
    "there is at least one communityB report id",
    reportIdsForCommunityB.length > 0,
  );

  const idsFromQueueA = queueForA.data.map((s) => s.id);
  const idsFromQueueB = queueForB.data.map((s) => s.id);

  TestValidator.predicate(
    "queues for A and B should have disjoint ids",
    idsFromQueueA.every((id) => !idsFromQueueB.includes(id)),
  );
}
