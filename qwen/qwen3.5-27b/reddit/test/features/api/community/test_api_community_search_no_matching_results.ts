import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test community search with no matching results scenario.
 * Validates proper handling when search query returns empty results.
 * 1. Authenticate as member user
 * 2. Search with unique term that won't match any communities
 * 3. Verify empty data array with valid pagination metadata
 */
export async function test_api_community_search_no_matching_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: undefined,
  });
  // 2. Search for non-existent community
  const searchQuery = `xyznonexistent${typia.random<number & tags.Type<"uint32">>()}`;
  const result =
    await api.functional.redditClone.member.communities.search.index(
      memberConnection,
      {
        body: {
          search: searchQuery,
          page: 1,
          pageSize: 20,
        } satisfies IRedditCloneCommunity.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate empty results with proper pagination
  TestValidator.equals("data array is empty", result.data.length, 0);
  TestValidator.equals("records count is zero", result.pagination.records, 0);
  TestValidator.equals("pages count is zero", result.pagination.pages, 0);
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is preserved", result.pagination.limit, 20);
}
