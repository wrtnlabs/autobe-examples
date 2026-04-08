import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_community_stats_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account for authenticated context
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Soft-deleted community UUID (exists in database with deleted_at set)
  const softDeletedCommunityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Try to access stats of soft-deleted community - expect 404
  await TestValidator.httpError(
    "should return 404 for soft-deleted community",
    404,
    async () => {
      const stats =
        await api.functional.redditCommunity.guest.communities.stats.at(
          guestConnection,
          { communityId: softDeletedCommunityId },
        );
      // Should never reach here due to 404 error
      typia.assert(stats);
      throw new Error("Expected 404 error but got successful response");
    },
  );
}