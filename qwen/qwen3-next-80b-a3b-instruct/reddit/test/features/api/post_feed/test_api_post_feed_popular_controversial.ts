import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityMvPostFeedIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMvPostFeedIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityMvPostFeedIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMvPostFeedIndex";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_feed_popular_controversial(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for admin user
  const adminConnection: api.IConnection = { host: connection.host };
  // Query the popular feed with controversial algorithm (limit 20)
  // IRequest type is empty, so we pass an empty object
  const response = await api.functional.community.post_feed_indices.index(
    adminConnection,
    {
      body: {},
    },
  );
  // Validate response structure
  typia.assert(response);
  // Validate that we received exactly 20 posts
  TestValidator.equals("response has 20 posts", response.data.length, 20);
  // Validate pagination
  TestValidator.equals("pagination limit is 20", response.pagination.limit, 20);
  TestValidator.equals(
    "pagination current is 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "total records >= 20",
    response.pagination.records >= 20,
  );
  TestValidator.predicate("total pages >= 1", response.pagination.pages >= 1);
}
{
}
