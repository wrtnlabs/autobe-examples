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

export async function test_api_moderator_password_change_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator account
  const originalPassword = RandomGenerator.alphaNumeric(16);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: originalPassword,
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
  // Store the original authorization token
  const originalToken = moderator.token;
  // Generate new password
  const newPassword = RandomGenerator.alphaNumeric(16);
  // Change password
  await api.functional.communityPlatform.moderator.password.updatePassword(
    moderatorConnection,
    {
      body: {
        current_password: originalPassword,
        new_password: newPassword,
      } satisfies ICommunityPlatformModerator.IChangePassword,
    },
  );
  // Verify old session token is invalidated by attempting an API call
  const invalidConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: originalToken.access },
  };
  await TestValidator.error(
    "old token should be invalid after password change",
    async () => {
      await api.functional.communityPlatform.moderator.password.updatePassword(
        invalidConnection,
        {
          body: {
            current_password: newPassword,
            new_password: RandomGenerator.alphaNumeric(16),
          } satisfies ICommunityPlatformModerator.IChangePassword,
        },
      );
    },
  );
  // Verify that the original connection (with updated token) still works
  await api.functional.communityPlatform.moderator.password.updatePassword(
    moderatorConnection,
    {
      body: {
        current_password: newPassword,
        new_password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformModerator.IChangePassword,
    },
  );
}
