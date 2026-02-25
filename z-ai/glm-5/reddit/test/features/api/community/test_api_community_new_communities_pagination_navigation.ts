import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

/**
 * Test pagination behavior when browsing through multiple pages of newly created communities.
 * This ensures efficient browsing of potentially large numbers of new communities.
 *
 * Test flow:
 * 1. Create a member account for authentication
 * 2. Create at least 15 communities within the last 30 days for pagination testing
 * 3. Call GET /community/communities/new and verify pagination structure
 * 4. Validate pagination metadata accuracy (current, limit, records, pages)
 * 5. Verify data contains community summaries with correct fields
 */
export async function test_api_community_new_communities_pagination_navigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create 15 communities to ensure we have enough data for pagination
  const communities = await ArrayUtil.asyncRepeat(15, async () => {
    return await generate_random_community_member_communities_create(
      memberConnection,
      {},
    );
  });
  // 3. Get new communities list with pagination
  const result =
    await api.functional.community.communities._new.recent(memberConnection);
  typia.assert(result);
  // 4. Validate pagination structure
  TestValidator.predicate("pagination exists", result.pagination !== null);
  TestValidator.predicate(
    "current page is positive",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 5. Validate pagination calculation
  const expectedPages = Math.ceil(
    result.pagination.records / result.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation",
    result.pagination.pages,
    expectedPages,
  );
  // 6. Validate data array
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // 7. Validate each community summary in data
  result.data.forEach((community, index) => {
    TestValidator.predicate(
      `community ${index} has id`,
      community.id !== undefined,
    );
    TestValidator.predicate(
      `community ${index} has name`,
      community.name !== undefined,
    );
    TestValidator.predicate(
      `community ${index} has description`,
      community.description !== undefined,
    );
    TestValidator.predicate(
      `community ${index} has subscriber_count`,
      community.subscriber_count !== undefined,
    );
    TestValidator.predicate(
      `community ${index} has created_at`,
      community.created_at !== undefined,
    );
  });
  // 8. Validate that created communities are in the list (new communities within 30 days)
  const createdIds = communities.map((c) => c.id);
  const resultIds = result.data.map((c) => c.id);
  const foundCount = createdIds.filter((id) => resultIds.includes(id)).length;
  TestValidator.predicate(
    "some created communities found in results",
    foundCount > 0,
  );
}
