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

/**
 * Test pagination behavior and limit validation for community snapshot retrieval.
 * Authenticate as admin, then test pagination by requesting specific pages with different limit values.
 * Verify that pagination metadata accurately reflects the data set size, current page position, and total pages.
 * Test edge cases including first page, intermediate pages, and final page with partial data.
 * Validate that limit parameters are respected and default to appropriate values when not specified.
 */
export async function test_api_community_snapshot_admin_pagination_and_limit_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate a random community ID for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Default pagination (no parameters)
  const defaultResponse =
    await api.functional.communityPlatform.admin.communities.snapshots.index(
      adminConnection,
      {
        communityId,
        body: {} satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Test 2: Specific page with custom limit
  const customLimit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
  >();
  const page2Response =
    await api.functional.communityPlatform.admin.communities.snapshots.index(
      adminConnection,
      {
        communityId,
        body: {
          page: 2,
          limit: customLimit,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(page2Response);
  // Validate custom pagination parameters
  TestValidator.equals(
    "custom page parameter",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom limit parameter",
    page2Response.pagination.limit,
    customLimit,
  );
  // Test 3: Maximum limit validation
  const maxLimitResponse =
    await api.functional.communityPlatform.admin.communities.snapshots.index(
      adminConnection,
      {
        communityId,
        body: {
          limit: 100,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.predicate(
    "limit respects maximum",
    maxLimitResponse.pagination.limit <= 100,
  );
  // Test 4: Minimum page validation
  const minPageResponse =
    await api.functional.communityPlatform.admin.communities.snapshots.index(
      adminConnection,
      {
        communityId,
        body: {
          page: 1,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(minPageResponse);
  TestValidator.predicate(
    "page respects minimum",
    minPageResponse.pagination.current >= 1,
  );
  // Test 5: Pagination metadata consistency
  TestValidator.predicate(
    "records count consistent",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count consistent",
    defaultResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "current page consistent",
    defaultResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit consistent",
    defaultResponse.pagination.limit >= 0,
  );
  // Test 6: Data array validation
  TestValidator.predicate("data is array", Array.isArray(defaultResponse.data));
  // If there are snapshots, validate their structure
  if (defaultResponse.data.length > 0) {
    const snapshot = defaultResponse.data[0];
    TestValidator.equals(
      "first snapshot has valid structure",
      typeof snapshot.name,
      "string",
    );
    TestValidator.equals(
      "first snapshot has timestamp",
      typeof snapshot.created_at,
      "string",
    );
  }
  // Test 7: Empty request with different parameters
  const emptyRequestResponse =
    await api.functional.communityPlatform.admin.communities.snapshots.index(
      adminConnection,
      {
        communityId,
        body: {
          snapshot_reason: null,
          created_at_start: undefined,
          created_at_end: undefined,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(emptyRequestResponse);
  TestValidator.predicate(
    "empty request returns valid pagination",
    emptyRequestResponse.pagination.records >= 0,
  );
}
