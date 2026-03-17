import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_nonexistent_user_profile_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session for unauthenticated access
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(guestAuth);
  // 2. Create authenticated connection using guest token
  const authenticatedGuestConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedGuestConnection.headers = {
    Authorization: `Bearer ${guestAuth.token.access}`,
  };
  // 3. Generate random UUID that likely doesn't exist in database
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  // 4. Query non-existent user profile - should return 404 Not Found
  await TestValidator.httpError(
    "non-existent user profile should return 404 Not Found",
    404,
    async () => {
      await api.functional.redditCommunity.guest.users.profile.at(
        authenticatedGuestConnection,
        {
          userId: nonExistentUserId,
        },
      );
    },
  );
}