import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAccountRestriction";

export async function test_api_admin_user_account_restrictions_listing_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Create acting admin A
  const adminAJoinBody =
    typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminA: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);

  // 2. Create subject admin B (separate account) using a new connection so token switch is isolated
  const adminBConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const adminBJoinBody =
    typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminB: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(adminBConnection, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);

  const subjectUsername: string = adminB.username;

  // 3. Seed multiple restriction episodes (e.g., 6) for admin B using admin A's authenticated connection
  const restrictionCount = 6;
  const allRestrictions: ICommunityPlatformAccountRestriction[] = [];

  for (let i = 0; i < restrictionCount; i++) {
    const startsAt = new Date(Date.now() + i * 60_000).toISOString();
    const endsAt = new Date(Date.now() + (i + 60) * 60_000).toISOString();

    const reasonCategory = `category_${i}`;

    const createBody = {
      account_type: "adminUser",
      scope: "login",
      reason_category: reasonCategory,
      reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
      starts_at: startsAt,
      ends_at: endsAt,
    } satisfies ICommunityPlatformAccountRestriction.ICreate;

    const created: ICommunityPlatformAccountRestriction =
      await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.create(
        connection,
        {
          username: subjectUsername,
          body: createBody,
        },
      );
    typia.assert(created);
    allRestrictions.push(created);
  }

  // Sort seeded restrictions by created_at descending for expected ordering
  const seededSortedDesc = [...allRestrictions].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );

  // 4. Page 1, limit 3, sort by created_at desc
  const page1Body = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_direction: "desc" as const,
    subject_username: subjectUsername,
    subject_type: "adminUser",
  } satisfies ICommunityPlatformAccountRestriction.IRequest;

  const page1: IPageICommunityPlatformAccountRestriction.ISummary =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.index(
      connection,
      {
        username: subjectUsername,
        body: page1Body,
      },
    );
  typia.assert(page1);

  TestValidator.equals(
    "page1 current page should be 1",
    page1.pagination.current,
    1 as number,
  );
  TestValidator.equals(
    "page1 limit should be 3",
    page1.pagination.limit,
    3 as number,
  );
  TestValidator.equals(
    "page1 data length should be 3",
    page1.data.length,
    3 as number,
  );

  // Validate descending order by created_at in page1
  TestValidator.predicate("page1 is sorted desc by created_at", () => {
    for (let i = 1; i < page1.data.length; i++) {
      if (page1.data[i - 1].created_at < page1.data[i].created_at) return false;
    }
    return true;
  });

  const page1Ids = page1.data.map((s) => s.id);

  // 5. Page 2, same limit and sorting
  const page2Body = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_direction: "desc" as const,
    subject_username: subjectUsername,
    subject_type: "adminUser",
  } satisfies ICommunityPlatformAccountRestriction.IRequest;

  const page2: IPageICommunityPlatformAccountRestriction.ISummary =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.index(
      connection,
      {
        username: subjectUsername,
        body: page2Body,
      },
    );
  typia.assert(page2);

  TestValidator.equals(
    "page2 current page should be 2",
    page2.pagination.current,
    2 as number,
  );
  TestValidator.equals(
    "page2 limit should be 3",
    page2.pagination.limit,
    3 as number,
  );

  const page2Ids = page2.data.map((s) => s.id);

  // Ensure no overlap between page1 and page2 IDs
  TestValidator.predicate(
    "page1 and page2 must not have overlapping IDs",
    () => !page1Ids.some((id) => page2Ids.includes(id)),
  );

  const combinedIds = [...page1Ids, ...page2Ids];
  const expectedFirstSixIds = seededSortedDesc.slice(0, 6).map((r) => r.id);

  TestValidator.equals(
    "combined page1+page2 IDs should equal first six seeded IDs (order insensitive)",
    combinedIds.sort(),
    expectedFirstSixIds.slice().sort(),
  );

  // 7. Optional: verify ascending sort reverses order
  const ascBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_direction: "asc" as const,
    subject_username: subjectUsername,
    subject_type: "adminUser",
  } satisfies ICommunityPlatformAccountRestriction.IRequest;

  const ascPage: IPageICommunityPlatformAccountRestriction.ISummary =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.index(
      connection,
      {
        username: subjectUsername,
        body: ascBody,
      },
    );
  typia.assert(ascPage);

  const ascendingExpectedFirstId =
    seededSortedDesc[seededSortedDesc.length - 1].id;

  if (ascPage.data.length > 0) {
    TestValidator.equals(
      "ascending first item should match oldest seeded restriction",
      ascPage.data[0].id,
      ascendingExpectedFirstId,
    );
  }
}
