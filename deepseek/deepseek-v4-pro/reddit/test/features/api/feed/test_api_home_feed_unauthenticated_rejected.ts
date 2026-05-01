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
 * Test that the home feed endpoint rejects unauthenticated requests.
 *
 * Verifies that the personalized home feed, which depends on the authenticated user's subscription list to determine which community posts to display, is inaccessible to unauthenticated users. The endpoint must reject requests made without valid authentication with a 401 Unauthorized response.
 *
 * 1. Create a guest connection containing only the host with no authentication headers or session.
 * 2. Call the home feed endpoint with the guest connection and an empty request body (all query parameters are optional).
 * 3. Assert the request is rejected with a 401 Unauthorized error.
 */
export async function test_api_home_feed_unauthenticated_rejected(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated home feed rejected",
    401,
    async () => {
      await api.functional.communityHub.feed.home.index(guestConnection, {
        body: {} satisfies ICommunityHubPost.IRequest,
      });
    },
  );
}
