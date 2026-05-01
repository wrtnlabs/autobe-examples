import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that listing subscriptions for a non-existent community returns HTTP 404.
 *
 * Validates the business rule that deleted or nonexistent communities should not expose subscription data. The test generates a random community name guaranteed not to exist in the database and asserts that the server responds with a 404 Not Found error.
 *
 * 1. Generate a random, non-existent community name.
 * 2. Call the subscriptions listing endpoint with the fake community name and an empty search body.
 * 3. Assert that the server returns HTTP 404.
 */
export async function test_api_community_subscriptions_list_nonexistent_community(
  connection: api.IConnection,
): Promise<void> {
  await TestValidator.httpError(
    "non-existent community returns 404",
    404,
    async () => {
      await api.functional.communityHub.communities.subscriptions.index(
        connection,
        {
          communityName: typia.random<string>(),
          body: {} satisfies ICommunityHubCommunitySubscription.IRequest,
        },
      );
    },
  );
}
