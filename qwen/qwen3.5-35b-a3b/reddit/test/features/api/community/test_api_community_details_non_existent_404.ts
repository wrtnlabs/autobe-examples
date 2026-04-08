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

export async function test_api_community_details_non_existent_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest user
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Create guest connection with authorization
  const guestConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${guestAuth.token.access}` },
  };
  // 3. Generate a valid UUID format that doesn't exist in the database
  const nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  // 4. Verify non-existent community returns 404
  await TestValidator.httpError(
    "non-existent community returns 404",
    404,
    async () =>
      await api.functional.redditCommunity.guest.communities.at(
        guestConnection,
        {
          communityId: nonExistentUUID,
        },
      ),
  );
  // 5. Verify system doesn't leak information about existing communities
  const anotherNonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "random non-existent UUID returns 404",
    404,
    async () =>
      await api.functional.redditCommunity.guest.communities.at(
        guestConnection,
        {
          communityId: anotherNonExistentUUID,
        },
      ),
  );
}