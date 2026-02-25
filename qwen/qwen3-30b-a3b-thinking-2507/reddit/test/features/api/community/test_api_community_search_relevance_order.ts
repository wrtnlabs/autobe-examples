import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunity";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_search_relevance_order(
  connection: api.IConnection,
) {
  const response = await api.functional.reddit.communities.index(connection, {
    body: { search: "Tech" },
  });
  typia.assert(response);
  TestValidator.equals(
    "exact match should be first",
    response.data[0].name,
    "Tech Forum",
  );
  TestValidator.equals(
    "partial match should be second",
    response.data[1].name,
    "Technology News",
  );
  TestValidator.predicate(
    "subscriber count descending",
    response.data[1].subscriber_count > response.data[2].subscriber_count,
  );
}
