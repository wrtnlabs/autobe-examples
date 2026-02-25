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

export async function test_api_moderator_refresh_expired_token_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create a moderator account to obtain initial refresh token
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(authorized);
  // Test refresh with a non-existent token (simulating expired token scenario)
  // Since we cannot control token expiration, we use an invalid token format
  // that the system should reject with appropriate error handling
  await TestValidator.error("invalid refresh token rejection", async () => {
    await authorize_moderator_refresh(moderatorConnection, {
      body: {
        refresh_token: "invalid_nonexistent_token_that_should_be_rejected",
      } satisfies ICommunityPlatformModerator.IRefresh,
    });
  });
  // Additionally test with empty token to ensure proper validation
  await TestValidator.error("empty refresh token rejection", async () => {
    await authorize_moderator_refresh(moderatorConnection, {
      body: {
        refresh_token: "",
      } satisfies ICommunityPlatformModerator.IRefresh,
    });
  });
}
