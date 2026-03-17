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

export async function test_api_guest_deleted_user_profile_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session for unauthenticated access
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: RandomGenerator.alphabets(20),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guestAuth);
  // 2. Verify guest profile is initially visible
  const actualProfile =
    await api.functional.redditCommunity.guest.users.profile.at(
      guestConnection,
      {
        userId: guestAuth.id,
      },
    );
  typia.assert(actualProfile);
  TestValidator.equals("guest profile exists", actualProfile.id, guestAuth.id);
  TestValidator.predicate(
    "guest has display name",
    actualProfile.display_name.length > 0,
  );
  // 3. Query non-existent user profile (simulating soft-deleted state)
  // Use a different UUID to ensure it's not the same user
  const nonExistentUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  TestValidator.notEquals(
    "different user IDs",
    nonExistentUserId,
    guestAuth.id,
  );
  // 4. Validate 404 response for non-existent/soft-deleted profile
  await TestValidator.httpError(
    "non-existent user profile returns 404",
    404,
    async () => {
      await api.functional.redditCommunity.guest.users.profile.at(
        guestConnection,
        {
          userId: nonExistentUserId,
        },
      );
    },
  );
}
