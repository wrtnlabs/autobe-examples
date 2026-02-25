import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_histories_search_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register admin account
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test 1: Default search without filters
  const defaultSearch =
    await api.functional.communityPlatform.admin.histories.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(defaultSearch);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    defaultSearch.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", defaultSearch.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    defaultSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    defaultSearch.pagination.pages >= 0,
  );
  // Validate data structure
  for (const snapshot of defaultSearch.data) {
    typia.assert(snapshot);
    TestValidator.predicate("has id", typeof snapshot.id === "string");
    TestValidator.predicate("has name", typeof snapshot.name === "string");
    TestValidator.predicate(
      "has created_at",
      typeof snapshot.created_at === "string",
    );
  }
  // Test 2: Date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeSearch =
    await api.functional.communityPlatform.admin.histories.index(
      adminConnection,
      {
        body: {
          created_at_start: oneWeekAgo.toISOString(),
          created_at_end: now.toISOString(),
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(dateRangeSearch);
  // Test 3: snapshot_reason filtering
  const reasonSearch =
    await api.functional.communityPlatform.admin.histories.index(
      adminConnection,
      {
        body: {
          snapshot_reason: "moderation_audit",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(reasonSearch);
  // Test 4: Pagination validation
  if (defaultSearch.pagination.pages > 1) {
    const secondPage =
      await api.functional.communityPlatform.admin.histories.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "same total records",
      secondPage.pagination.records,
      defaultSearch.pagination.records,
    );
  }
  // Test 5: Combined filters
  const combinedSearch =
    await api.functional.communityPlatform.admin.histories.index(
      adminConnection,
      {
        body: {
          snapshot_reason: "owner_change",
          created_at_start: oneWeekAgo.toISOString(),
          page: 1,
          limit: 3,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(combinedSearch);
}
