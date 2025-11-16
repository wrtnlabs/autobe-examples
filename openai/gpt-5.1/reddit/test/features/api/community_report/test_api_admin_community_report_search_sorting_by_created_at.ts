import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityReport";

export async function test_api_admin_community_report_search_sorting_by_created_at(
  connection: api.IConnection,
) {
  // 1. Register admin user (join) and keep credentials
  const adminUsername: string = RandomGenerator.name(1);
  const adminEmail: string = `${RandomGenerator.alphabets(8)}@admin.test`; // email format
  const adminPassword: string = "AdminPassw0rd!";

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminJoinOutput: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinOutput);

  // 2. Register member user (join) and stay authenticated as memberUser
  const memberUsername: string = RandomGenerator.name(1);
  const memberEmail: string = `${RandomGenerator.alphabets(8)}@member.test`;
  const memberPassword: string = "MemberPassw0rd!";

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://client.test/member/join",
    referrer: "https://client.test/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberJoinOutput: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoinOutput);

  // 3. Create a community as memberUser
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 4. Create at least three community-level reports for the same community
  const reportIds: string[] = [];
  const reportCreatedAts: string[] = [];

  const createReport = async (reasonSuffix: string): Promise<void> => {
    const reportCreateBody = {
      community_id: community.id,
      reason_category: "test_reason",
      reason_detail: `Test report ${reasonSuffix}`,
    } satisfies ICommunityPlatformCommunityReport.ICreate;

    const report: ICommunityPlatformCommunityReport =
      await api.functional.communityPlatform.memberUser.communityReports.create(
        connection,
        {
          body: reportCreateBody,
        },
      );
    typia.assert(report);

    reportIds.push(report.id);
    reportCreatedAts.push(report.created_at);
  };

  await createReport("A");
  await createReport("B");
  await createReport("C");

  // 5. Switch authentication to adminUser via login
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://client.test/admin/login",
    referrer: "https://client.test/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginOutput: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginOutput);

  // 6. Call admin report index twice, once asc and once desc
  const baseSearchBody = {
    page: 1,
    limit: 10,
    status: null,
    reason_category: null,
    community_id: community.id,
    reporter_memberuser_id: null,
    created_from: null,
    created_to: null,
    order_by: "created_at",
    search: null,
  } satisfies ICommunityPlatformCommunityReport.IRequest;

  const ascSearchBody: ICommunityPlatformCommunityReport.IRequest = {
    ...baseSearchBody,
    order_direction: "asc",
  };

  const descSearchBody: ICommunityPlatformCommunityReport.IRequest = {
    ...baseSearchBody,
    order_direction: "desc",
  };

  const ascPage: IPageICommunityPlatformCommunityReport.ISummary =
    await api.functional.communityPlatform.adminUser.communityReports.index(
      connection,
      {
        body: ascSearchBody,
      },
    );
  typia.assert(ascPage);

  const descPage: IPageICommunityPlatformCommunityReport.ISummary =
    await api.functional.communityPlatform.adminUser.communityReports.index(
      connection,
      {
        body: descSearchBody,
      },
    );
  typia.assert(descPage);

  const ascData: ICommunityPlatformCommunityReport.ISummary[] = ascPage.data;
  const descData: ICommunityPlatformCommunityReport.ISummary[] = descPage.data;

  // 7. Filter results only to reports we just created
  const createdIdSet = new Set(reportIds);

  const ascFiltered = ascData.filter((item) => createdIdSet.has(item.id));
  const descFiltered = descData.filter((item) => createdIdSet.has(item.id));

  TestValidator.predicate(
    "ascending result should contain at least our three reports",
    ascFiltered.length >= 3,
  );
  TestValidator.predicate(
    "descending result should contain at least our three reports",
    descFiltered.length >= 3,
  );

  const ascFilteredIds = ascFiltered.map((item) => item.id);
  const descFilteredIds = descFiltered.map((item) => item.id);

  // Ensure the sets of ids are equal (ignoring order)
  const sortedAscIds = [...ascFilteredIds].sort();
  const sortedDescIds = [...descFilteredIds].sort();

  TestValidator.equals(
    "asc and desc filtered ids must match as sets",
    sortedAscIds,
    sortedDescIds,
  );

  // Ensure descending order is the reverse of ascending order
  const ascIdsForCompare = [...ascFilteredIds];
  const descIdsReversed = [...descFilteredIds].reverse();

  TestValidator.equals(
    "descending ids should be reverse of ascending ids",
    ascIdsForCompare,
    descIdsReversed,
  );

  // 8. Validate created_at ordering (ISO 8601, lexicographical comparison works)
  const isNonDecreasing = (
    items: ICommunityPlatformCommunityReport.ISummary[],
  ): boolean => {
    for (let i = 1; i < items.length; i++) {
      if (items[i - 1].created_at > items[i].created_at) return false;
    }
    return true;
  };

  const isNonIncreasing = (
    items: ICommunityPlatformCommunityReport.ISummary[],
  ): boolean => {
    for (let i = 1; i < items.length; i++) {
      if (items[i - 1].created_at < items[i].created_at) return false;
    }
    return true;
  };

  TestValidator.predicate(
    "ascending created_at should be non-decreasing",
    isNonDecreasing(ascFiltered),
  );

  TestValidator.predicate(
    "descending created_at should be non-increasing",
    isNonIncreasing(descFiltered),
  );
}
