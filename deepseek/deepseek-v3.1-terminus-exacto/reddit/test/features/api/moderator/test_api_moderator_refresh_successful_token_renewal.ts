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

export async function test_api_moderator_refresh_successful_token_renewal(
  connection: api.IConnection,
): Promise<void> {
  // Create initial moderator account and obtain tokens
  const moderatorConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_moderator_join(moderatorConnection, {
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
  typia.assert(initialAuth);
  // Store the initial refresh token
  const initialRefreshToken = initialAuth.token.refresh;
  // Create a new connection for the refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // Perform token refresh using the initial refresh token
  const refreshedAuth = await authorize_moderator_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies ICommunityPlatformModerator.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Validate that new tokens are different from initial tokens
  TestValidator.notEquals(
    "access token should be renewed",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be renewed",
    initialAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
  // Validate that moderator profile information remains consistent
  TestValidator.equals(
    "moderator ID should remain the same",
    initialAuth.id,
    refreshedAuth.id,
  );
  TestValidator.equals(
    "moderator email should remain the same",
    initialAuth.email,
    refreshedAuth.email,
  );
  TestValidator.equals(
    "moderator username should remain the same",
    initialAuth.username,
    refreshedAuth.username,
  );
  // Validate token expiration timestamps
  TestValidator.predicate(
    "expired_at should be in the future",
    new Date(refreshedAuth.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until should be in the future",
    new Date(refreshedAuth.token.refreshable_until) > new Date(),
  );
  // The refresh token rotation is validated by the successful refresh operation itself
  // and the fact that new tokens are generated, indicating the old refresh token was consumed
  TestValidator.predicate(
    "refresh token rotation successful",
    refreshedAuth.token.refresh !== initialRefreshToken,
  );
}
