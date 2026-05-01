import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that requesting the community feed for a non-existent community returns a 404 Not Found error.
 *
 * Validates the community resolution guard in the feed endpoint by requesting the post feed for a community name that does not exist. The endpoint must resolve the community by name (case-insensitive match) before querying posts — when the community cannot be found, it should immediately return a 404 error without attempting any database queries for posts.
 *
 * This endpoint is publicly accessible and requires no authentication. The 404 response must be returned regardless of whether the caller provides credentials or not.
 *
 * 1. Construct a randomly generated community name that is guaranteed not to exist in the database.
 * 2. Call the community feed endpoint with empty default query parameters.
 * 3. Verify the response is an HTTP 404 error, confirming the community resolution step correctly prevents post querying for non-existent communities.
 */
export async function test_api_community_feed_nonexistent_community(
  connection: api.IConnection,
): Promise<void> {
  const communityName = `nonexistent-${RandomGenerator.alphaNumeric(16)}`;
  await TestValidator.httpError(
    "non-existent community feed returns 404",
    404,
    async () => {
      await api.functional.communityHub.communities.feed.index(connection, {
        communityName,
        body: {} satisfies ICommunityHubPost.IRequest,
      });
    },
  );
}
