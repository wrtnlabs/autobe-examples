import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_password_change_invalid_current_password(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "originalPassword123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderator);
  // Store original token for comparison
  const originalToken = moderatorConnection.headers?.Authorization;
  // Attempt password change with incorrect current password
  await TestValidator.error(
    "password change should fail with incorrect current password",
    async () => {
      await api.functional.communityPlatform.moderator.password.updatePassword(
        moderatorConnection,
        {
          body: {
            current_password: "wrongPassword456",
            new_password: "newPassword789",
          } satisfies ICommunityPlatformModerator.IChangePassword,
        },
      );
    },
  );
  // Verify session token remains unchanged (session still valid)
  TestValidator.equals(
    "Authorization header should remain unchanged after failed password change",
    moderatorConnection.headers?.Authorization,
    originalToken,
  );
  // Verify moderator data integrity by checking the connection still works
  // Since we don't have other moderator endpoints, we'll validate the token format
  TestValidator.predicate(
    "Authorization token should be valid format",
    typeof moderatorConnection.headers?.Authorization === "string" &&
      moderatorConnection.headers.Authorization.length > 0,
  );
}
