import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";

export async function test_api_moderator_registration_success(
  connection: api.IConnection,
) {
  // 1) Prepare a valid moderator registration payload
  const username = RandomGenerator.alphaNumeric(10);
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();

  const requestBody = {
    username,
    email,
    password,
    display_name: displayName,
  } satisfies ICommunityPortalModerator.ICreate;

  // 2) Happy-path: register moderator
  const created: ICommunityPortalModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: requestBody,
    });
  // Validate types and structure
  typia.assert(created);
  typia.assert(created.token);

  // Business assertions
  TestValidator.equals(
    "created username matches",
    created.username,
    requestBody.username,
  );
  TestValidator.equals(
    "created display_name matches",
    created.display_name,
    requestBody.display_name,
  );

  // Token assertions: access and refresh exist and are non-empty strings
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof created.token.access === "string" && created.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof created.token.refresh === "string" &&
      created.token.refresh.length > 0,
  );

  // Karma may be undefined or an integer; assert type consistency
  TestValidator.predicate(
    "karma is number or undefined",
    created.karma === undefined || typeof created.karma === "number",
  );

  // 3) Business-negative: duplicate registration with same payload should fail
  await TestValidator.error(
    "duplicate moderator registration should fail",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: requestBody,
      });
    },
  );
}
