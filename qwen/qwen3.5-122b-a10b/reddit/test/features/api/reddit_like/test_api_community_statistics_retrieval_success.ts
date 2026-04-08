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

export async function test_api_community_statistics_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest for authentication context
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Generate a valid community UUID for statistics retrieval
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve community statistics
  const statistics =
    await api.functional.redditLike.guest.communities.statistics(
      guestConnection,
      {
        communityId,
      },
    );
  typia.assert(statistics);
  // 4. Validate statistics response has all required fields with valid values
  TestValidator.predicate(
    "subscriber_count exists and is non-negative",
    statistics.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "post_count exists and is non-negative",
    statistics.post_count >= 0,
  );
  TestValidator.predicate(
    "comment_count exists and is non-negative",
    statistics.comment_count >= 0,
  );
  // 5. Validate total count consistency (all counts should be valid integers)
  TestValidator.equals(
    "statistics object structure is complete",
    Object.keys(statistics).sort(),
    ["comment_count", "post_count", "subscriber_count"].sort(),
  );
}
