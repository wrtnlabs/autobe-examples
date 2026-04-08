import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationsSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganizationsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganizationsSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_snapshots_filter_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration creates organization
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: `${RandomGenerator.name(2)}@example.com`,
        password: RandomGenerator.alphaNumeric(16),
        org_name: RandomGenerator.name(2),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        org_description: RandomGenerator.paragraph(),
        href: "http://localhost",
        referrer: "http://localhost",
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(authorized);
  // Extract organization ID from member session
  const organizationId = authorized.sessions?.[0]?.organization?.id;
  if (!organizationId) {
    throw new Error("Organization not found in member session");
  }
  // 2. List all snapshots to establish baseline
  const allSnapshots: IPageIHrmPlatformOrganizationsSnapshot.ISummary =
    await api.functional.hrmPlatform.member.organizations.snapshots.index(
      memberConnection,
      {
        organizationId,
        body: { limit: 100 },
      },
    );
  typia.assert(allSnapshots);
  // 3. Test date range filtering
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const threeDaysAgo = new Date(now.getTime() - 3 * oneDay).toISOString();
  const oneDayAgo = new Date(now.getTime() - 1 * oneDay).toISOString();
  const dateRangeQuery: IHrmPlatformOrganizationsSnapshot.IRequest = {
    created_at_min: threeDaysAgo,
    created_at_max: oneDayAgo,
    limit: 100,
  };
  const dateRangeResult: IPageIHrmPlatformOrganizationsSnapshot.ISummary =
    await api.functional.hrmPlatform.member.organizations.snapshots.index(
      memberConnection,
      {
        organizationId,
        body: dateRangeQuery,
      },
    );
  typia.assert(dateRangeResult);
  // Validate all returned snapshots are within date range
  TestValidator.predicate(
    "date range filter - all within range",
    dateRangeResult.data.every(
      (snapshot) =>
        snapshot.created_at >= threeDaysAgo && snapshot.created_at <= oneDayAgo,
    ),
  );
  // 4. Test status filtering
  const statusQuery: IHrmPlatformOrganizationsSnapshot.IRequest = {
    status: "active",
    limit: 100,
  };
  const statusResult: IPageIHrmPlatformOrganizationsSnapshot.ISummary =
    await api.functional.hrmPlatform.member.organizations.snapshots.index(
      memberConnection,
      {
        organizationId,
        body: statusQuery,
      },
    );
  typia.assert(statusResult);
  TestValidator.equals(
    "status filter - all active",
    true,
    statusResult.data.every((s) => s.status === "active"),
  );
  // 5. Test name search (case-insensitive)
  const searchQuery: IHrmPlatformOrganizationsSnapshot.IRequest = {
    search: "alpha",
    limit: 100,
  };
  const searchResult: IPageIHrmPlatformOrganizationsSnapshot.ISummary =
    await api.functional.hrmPlatform.member.organizations.snapshots.index(
      memberConnection,
      {
        organizationId,
        body: searchQuery,
      },
    );
  typia.assert(searchResult);
  // Verify search is case-insensitive (search for "ALPHA" should match "Alpha")
  const searchUpperQuery: IHrmPlatformOrganizationsSnapshot.IRequest = {
    search: "ALPHA",
    limit: 100,
  };
  const searchUpperResult: IPageIHrmPlatformOrganizationsSnapshot.ISummary =
    await api.functional.hrmPlatform.member.organizations.snapshots.index(
      memberConnection,
      {
        organizationId,
        body: searchUpperQuery,
      },
    );
  typia.assert(searchUpperResult);
  TestValidator.equals(
    "search case-insensitive - same results",
    searchResult.data.length,
    searchUpperResult.data.length,
  );
  // 6. Test combined filters
  const combinedQuery: IHrmPlatformOrganizationsSnapshot.IRequest = {
    created_at_min: threeDaysAgo,
    status: "active",
    search: "corp",
    limit: 100,
  };
  const combinedResult: IPageIHrmPlatformOrganizationsSnapshot.ISummary =
    await api.functional.hrmPlatform.member.organizations.snapshots.index(
      memberConnection,
      {
        organizationId,
        body: combinedQuery,
      },
    );
  typia.assert(combinedResult);
  // Validate all filters applied
  TestValidator.predicate(
    "combined filters - all conditions met",
    combinedResult.data.every((snapshot) => {
      const inDateRange =
        snapshot.created_at >= threeDaysAgo && snapshot.created_at <= oneDayAgo;
      const correctStatus = snapshot.status === "active";
      const matchesSearch = snapshot.name.toLowerCase().includes("corp");
      return inDateRange && correctStatus && matchesSearch;
    }),
  );
  // 7. Test empty results scenario
  const futureDate = new Date(now.getTime() + 100 * oneDay).toISOString();
  const emptyQuery: IHrmPlatformOrganizationsSnapshot.IRequest = {
    created_at_min: futureDate,
    limit: 100,
  };
  const emptyResult: IPageIHrmPlatformOrganizationsSnapshot.ISummary =
    await api.functional.hrmPlatform.member.organizations.snapshots.index(
      memberConnection,
      {
        organizationId,
        body: emptyQuery,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty results - records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results - pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty results - data array",
    emptyResult.data.length,
    0,
  );
  // 8. Verify sort order (created_at DESC)
  if (allSnapshots.data.length > 1) {
    for (let i = 1; i < allSnapshots.data.length; i++) {
      const prevDate = new Date(allSnapshots.data[i - 1].created_at).getTime();
      const currDate = new Date(allSnapshots.data[i].created_at).getTime();
      TestValidator.predicate(
        "snapshots sorted by created_at DESC",
        prevDate >= currDate,
      );
    }
  }
  // 9. Verify combined filters also maintain sort order
  if (combinedResult.data.length > 1) {
    for (let i = 1; i < combinedResult.data.length; i++) {
      const prevDate = new Date(
        combinedResult.data[i - 1].created_at,
      ).getTime();
      const currDate = new Date(combinedResult.data[i].created_at).getTime();
      TestValidator.predicate(
        "combined filters - sorted by created_at DESC",
        prevDate >= currDate,
      );
    }
  }
}
