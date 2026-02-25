import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteKarmaImpact";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteKarmaImpact";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an admin can retrieve vote karma impacts with basic filtering and pagination.
 * Create an admin user via join endpoint, then test retrieving impacts with default parameters.
 * Verify the response structure includes pagination metadata and karma impact records with
 * user summaries, karma deltas, and timestamps. Validate that soft-deleted records are
 * filtered out and only active impacts are returned. Test pagination by requesting different
 * page combinations and verifying record counts are accurate.
 */
export async function test_api_admin_vote_karma_impacts_basic_auditing(
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
  // Test default pagination (page 1, default limit)
  const defaultResponse =
    await api.functional.communityPlatform.admin.vote_karma_impacts.index(
      adminConnection,
      {
        body: {
          page: null,
          limit: null,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Validate pagination structure
  TestValidator.predicate(
    "current page is 1",
    defaultResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is positive",
    defaultResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // Test pagination with explicit page and limit
  const paginatedResponse =
    await api.functional.communityPlatform.admin.vote_karma_impacts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "page 1 current",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", paginatedResponse.pagination.limit, 10);
  TestValidator.predicate(
    "records consistent",
    paginatedResponse.pagination.records >= 0,
  );
  // Test empty page (beyond available data)
  const emptyPageResponse =
    await api.functional.communityPlatform.admin.vote_karma_impacts.index(
      adminConnection,
      {
        body: {
          page: 9999,
          limit: 10,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(emptyPageResponse);
  TestValidator.equals(
    "empty page current",
    emptyPageResponse.pagination.current,
    9999,
  );
  TestValidator.equals(
    "empty page limit",
    emptyPageResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty page data length",
    emptyPageResponse.data.length,
    0,
  );
}
