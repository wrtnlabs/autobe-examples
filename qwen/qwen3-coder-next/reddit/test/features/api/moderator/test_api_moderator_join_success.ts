import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the moderator registration
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Generate random test data for moderator registration
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
    username: RandomGenerator.alphabets(8),
  };
  // Register a new moderator
  const result = await authorize_moderator_join(moderatorConnection, {
    body: joinData,
  });
  // Validate the response structure
  typia.assert<IRedditPlatformModerator.IAuthorized>(result);
  // Verify the token structure
  TestValidator.predicate("token exists", result.token.access.length > 0);
  TestValidator.predicate(
    "refresh token exists",
    result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expiration date exists",
    result.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable until date exists",
    result.token.refreshable_until.length > 0,
  );
  // Verify token expiration is in the future
  const expiredAt = new Date(result.token.expired_at);
  TestValidator.predicate("token not expired", expiredAt > new Date());
  // Verify refreshable_until is in the future
  const refreshableUntil = new Date(result.token.refreshable_until);
  TestValidator.predicate(
    "refreshable until in future",
    refreshableUntil > new Date(),
  );
}
