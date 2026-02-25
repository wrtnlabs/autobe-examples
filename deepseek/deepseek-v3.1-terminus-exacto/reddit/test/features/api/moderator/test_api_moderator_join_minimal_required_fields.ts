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

export async function test_api_moderator_join_minimal_required_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Generate minimal required fields only (excluding optional fields)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphabets(8),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.IJoin;
  // Call moderator join endpoint with the created connection
  const response = await authorize_moderator_join(moderatorConnection, {
    body: joinBody,
  });
  // Validate response structure
  typia.assert(response);
  // Verify required fields match input
  TestValidator.equals("email matches input", response.email, joinBody.email);
  TestValidator.equals(
    "username matches input",
    response.username,
    joinBody.username,
  );
  // Verify display_name defaults to username when not provided
  TestValidator.equals(
    "display_name defaults to username",
    response.display_name,
    joinBody.username,
  );
  // Verify optional fields are null when not provided
  TestValidator.equals("bio is null when omitted", response.bio, null);
  TestValidator.equals(
    "avatar_url is null when omitted",
    response.avatar_url,
    null,
  );
  // Verify account is active by default
  TestValidator.predicate("account is active", response.is_active);
  // Verify default permission level
  TestValidator.predicate(
    "has permission level",
    response.permission_level.length > 0,
  );
  // Verify token is generated properly
  typia.assert(response.token);
  TestValidator.predicate(
    "access token exists",
    response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    response.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at date is valid",
    new Date(response.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until date is valid",
    new Date(response.token.refreshable_until) > new Date(),
  );
  // Verify timestamps are properly set
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(response.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(new Date(response.updated_at).getTime()),
  );
}
