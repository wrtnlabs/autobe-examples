import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunityStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityStatistic";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that retrieving statistics for a non-existent or deleted community returns HTTP 404.
 *
 * Validates the endpoint's error handling for community statistics retrieval when the target community does not exist or has been soft-deleted. The test ensures proper 404 Not Found responses for both scenarios.
 *
 * Guest authentication is established before testing the statistics endpoint with invalid community identifiers.
 *
 * 1. Guest authenticates via authorize_guest_join utility.
 * 2. Test with randomly generated UUID that does not exist in database.
 * 3. Validate HTTP 404 status code is returned.
 * 4. Test with another non-existent UUID to confirm consistent error handling.
 */
export async function test_api_community_statistics_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Test non-existent community UUID
  const nonExistentCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "non-existent community returns 404",
    404,
    async () =>
      await api.functional.redditLike.guest.communities.statistics(
        guestConnection,
        {
          communityId: nonExistentCommunityId,
        },
      ),
  );
  // 3. Test another non-existent UUID to confirm consistent behavior
  const anotherNonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "another non-existent community returns 404",
    404,
    async () =>
      await api.functional.redditLike.guest.communities.statistics(
        guestConnection,
        {
          communityId: anotherNonExistentId,
        },
      ),
  );
}
