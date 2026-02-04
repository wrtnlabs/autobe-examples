import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
export async function test_api_community_feed_public_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for unauthenticated access (no auth required)
  const guestConnection: api.IConnection = { host: connection.host };
  // Test each sort option with pagination parameters
  const sortOptions: ("hot" | "new" | "top" | "controversial")[] = [
    "hot",
    "new",
    "top",
    "controversial",
  ];
  for (const sort of sortOptions) {
    // Use default page (1) as specified in schema, randomize limit within bounds
    const page = 1;
    const limit = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >();
    // Execute API call with specific sort and pagination
    const response: IPageICommunityPlatformCommunity.ISummary =
      await api.functional.communityPlatform.communities.feed.index(
        guestConnection,
        {
          body: {
            page,
            limit,
            sort,
          } satisfies ICommunityPlatformCommunity.IRequest,
        },
      );
    // Validate response structure
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      "pagination current page matches requested",
      response.pagination.current,
      page,
    );
    TestValidator.equals(
      "pagination limit matches requested",
      response.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      response.pagination.pages >= 0,
    );
    // Validate that data is an array (no additional validation of content since typia.assert() handles all tags)
    TestValidator.predicate("data is an array", Array.isArray(response.data));
  }
}
