import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_discovery_new_sort(
  connection: api.IConnection,
): Promise<void> {
  // Test community discovery sorted by creation date ascending ('new' sort)
  // Use sort='new', page=1, limit=25. Verify communities are ordered by earliest created_at first.
  const response = await api.functional.redditCommunity.communities.index(
    connection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 25,
      },
    },
  );
  typia.assert(response);
  // Validate response structure
  TestValidator.equals("pagination page", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 25);
  TestValidator.predicate(
    "pagination records >= 25",
    response.pagination.records >= 25,
  );
  TestValidator.equals("data length", response.data.length, 25);
  // Verify sorting by created_at ascending (earliest first)
  // Communities should be ordered from earliest created_at to latest created_at
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = response.data[i];
    const next = response.data[i + 1];
    TestValidator.predicate(
      `community ${i} created before community ${i + 1}`,
      current.created_at <= next.created_at,
    );
  }
  // Ensure no duplicates in the result set
  const ids = response.data.map((item) => item.id);
  const uniqueIds = [...new Set(ids)];
  TestValidator.equals(
    "no duplicate community IDs",
    ids.length,
    uniqueIds.length,
  );
}
