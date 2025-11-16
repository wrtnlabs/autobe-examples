import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminuser";

export async function test_api_adminuser_index_adminusers_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Create a caller adminUser (first join) to establish authenticated context.
  const callerJoinBody = {
    username: "caller-admin",
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const caller: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: callerJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(caller);

  // 2. Seed additional adminUser accounts for pagination and sorting tests.
  const additionalCount = 18; // ensures at least 2 full pages when limit=10
  const seededAdmins: ICommunityPlatformAdminuser.IAuthorized[] = [];

  for (let i = 0; i < additionalCount; i++) {
    const index = (i + 1).toString().padStart(4, "0");
    const joinBody = {
      username: `admin-user-${index}`,
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformAdminUserJoin.IRequest;

    const admin = await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
    typia.assert<ICommunityPlatformAdminuser.IAuthorized>(admin);
    seededAdmins.push(admin);
  }

  // 3. Create a system configuration entry to mirror realistic admin state.
  const systemConfigBody = {
    category: "auth",
    config_key: "adminUsers.index.pagination.test",
    value: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const systemConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      { body: systemConfigBody },
    );
  typia.assert<ICommunityPlatformSystemConfig>(systemConfig);

  // Helper: verify that data is sorted in ascending order by displayName.
  const assertSortedAscByDisplayName = (
    items: ICommunityPlatformAdminuser.ISummary[],
  ): void => {
    for (let i = 1; i < items.length; i++) {
      const prev = items[i - 1];
      const curr = items[i];
      TestValidator.predicate(
        `ascending displayName at index ${i}`,
        prev.displayName <= curr.displayName,
      );
    }
  };

  // Helper: verify that data is sorted in descending order by displayName.
  const assertSortedDescByDisplayName = (
    items: ICommunityPlatformAdminuser.ISummary[],
  ): void => {
    for (let i = 1; i < items.length; i++) {
      const prev = items[i - 1];
      const curr = items[i];
      TestValidator.predicate(
        `descending displayName at index ${i}`,
        prev.displayName >= curr.displayName,
      );
    }
  };

  // 4. Call index with page=1, limit=10, sort_field="username", sort_direction="asc".
  const requestAscPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_field: "username",
    sort_direction: "asc" as const,
  } satisfies ICommunityPlatformAdminuser.IRequest;

  const page1Asc: IPageICommunityPlatformAdminuser.ISummary =
    await api.functional.communityPlatform.adminUser.adminUsers.index(
      connection,
      { body: requestAscPage1 },
    );
  typia.assert<IPageICommunityPlatformAdminuser.ISummary>(page1Asc);

  const pagination1 = page1Asc.pagination;
  const data1 = page1Asc.data;

  // Validate pagination metadata for page 1.
  TestValidator.equals(
    "page 1 current page should be 1",
    pagination1.current,
    1,
  );
  TestValidator.equals("page 1 limit should be 10", pagination1.limit, 10);

  // Ensure we have at least as many records as we created.
  TestValidator.predicate(
    "total records should be at least number of seeded admins plus caller",
    pagination1.records >= seededAdmins.length + 1,
  );

  // Expect the first page to contain exactly 10 items when enough data exists.
  TestValidator.equals(
    "page 1 should contain 10 admin summaries when enough data",
    data1.length,
    10,
  );

  // Verify ascending sorting by displayName on page 1.
  assertSortedAscByDisplayName(data1);

  // 6. Call the same endpoint with page=2 to get the second page.
  const requestAscPage2 = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_field: "username",
    sort_direction: "asc" as const,
  } satisfies ICommunityPlatformAdminuser.IRequest;

  const page2Asc: IPageICommunityPlatformAdminuser.ISummary =
    await api.functional.communityPlatform.adminUser.adminUsers.index(
      connection,
      { body: requestAscPage2 },
    );
  typia.assert<IPageICommunityPlatformAdminuser.ISummary>(page2Asc);

  const pagination2 = page2Asc.pagination;
  const data2 = page2Asc.data;

  // Validate pagination metadata for page 2.
  TestValidator.equals(
    "page 2 current page should be 2",
    pagination2.current,
    2,
  );
  TestValidator.equals("page 2 limit should be 10", pagination2.limit, 10);

  // Second page size: should be > 0 when we have more than 10 records.
  TestValidator.predicate(
    "page 2 should contain at least one record when records > 10",
    pagination1.records > 10 ? data2.length > 0 : data2.length === 0,
  );

  // Verify ascending sorting by displayName on page 2.
  assertSortedAscByDisplayName(data2);

  // 7. Ensure there is no overlap between page 1 and page 2.
  const idsPage1 = new Set(data1.map((item) => item.id));
  for (const item of data2) {
    TestValidator.predicate(
      `no overlap of ids between page 1 and page 2 for id ${item.id}`,
      idsPage1.has(item.id) === false,
    );
  }

  // 8. Optional: verify descending sort order.
  const requestDescPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_field: "username",
    sort_direction: "desc" as const,
  } satisfies ICommunityPlatformAdminuser.IRequest;

  const page1Desc: IPageICommunityPlatformAdminuser.ISummary =
    await api.functional.communityPlatform.adminUser.adminUsers.index(
      connection,
      { body: requestDescPage1 },
    );
  typia.assert<IPageICommunityPlatformAdminuser.ISummary>(page1Desc);

  const data1Desc = page1Desc.data;

  // Verify descending sort order on page 1 (desc).
  assertSortedDescByDisplayName(data1Desc);

  // Cross-check that asc and desc views are inverses locally for first and last.
  if (data1.length > 0 && data1Desc.length > 0) {
    const smallestAsc = data1[0].displayName;
    const largestAsc = data1[data1.length - 1].displayName;
    const smallestDesc = data1Desc[data1Desc.length - 1].displayName;
    const largestDesc = data1Desc[0].displayName;

    TestValidator.equals(
      "largest desc on page 1 should be >= smallest asc on page 1",
      largestDesc >= smallestAsc,
      true,
    );
    TestValidator.equals(
      "smallest desc on page 1 should be <= largest asc on page 1",
      smallestDesc <= largestAsc,
      true,
    );
  }
}
