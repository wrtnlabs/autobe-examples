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

export async function test_api_community_list_pagination_navigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register a member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create 5 communities to ensure enough data for pagination
  await ArrayUtil.asyncRepeat(5, async () => {
    await generate_random_community_member_communities_create(
      memberConnection,
      {},
    );
  });
  // Public connection (no auth needed for listing)
  const publicConnection: api.IConnection = { host: connection.host };
  // 3. Test First Page (page=1, limit=2)
  const page1Result = await api.functional.community.communities.index(
    publicConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 2);
  TestValidator.equals("page 1 data length", page1Result.data.length, 2);
  TestValidator.predicate(
    "page 1 records >= 5",
    page1Result.pagination.records >= 5,
  );
  TestValidator.predicate(
    "page 1 pages >= 3",
    page1Result.pagination.pages >= 3,
  );
  // 4. Test Second Page (page=2, limit=2)
  const page2Result = await api.functional.community.communities.index(
    publicConnection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 data length", page2Result.data.length, 2);
  // Verify communities on page 2 are different from page 1 (no duplicates)
  const page1Ids = new Set(page1Result.data.map((c) => c.id));
  const page2Ids = page2Result.data.map((c) => c.id);
  TestValidator.predicate(
    "page 2 communities are different from page 1",
    page2Ids.every((id) => !page1Ids.has(id)),
  );
  // 5. Test Out-of-Bound Page (page=999, limit=20)
  const outOfBoundResult = await api.functional.community.communities.index(
    publicConnection,
    {
      body: {
        page: 999,
        limit: 20,
      } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(outOfBoundResult);
  TestValidator.equals(
    "out-of-bound page data is empty",
    outOfBoundResult.data.length,
    0,
  );
  TestValidator.predicate(
    "out-of-bound records >= 5",
    outOfBoundResult.pagination.records >= 5,
  );
  TestValidator.equals(
    "out-of-bound current page",
    outOfBoundResult.pagination.current,
    999,
  );
}
