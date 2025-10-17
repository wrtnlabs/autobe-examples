import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";

/**
 * Validate successful moderator registration and returned authorization
 * payload.
 *
 * Business purpose:
 *
 * - Ensure a moderator account can be created via POST /auth/moderator/join
 * - Validate that the server returns an authorization container and minimal
 *   public profile (id, username, display_name, karma) without exposing
 *   sensitive authentication material.
 *
 * Steps:
 *
 * 1. Prepare a unique moderator create payload (username, email, password,
 *    optional display_name).
 * 2. Call api.functional.auth.moderator.join and await result.
 * 3. Typia.assert() the response to validate types.
 * 4. Validate business-level properties with TestValidator assertions.
 */
export async function test_api_moderator_registration_success(
  connection: api.IConnection,
) {
  // 1. Prepare unique moderator payload
  const username = `mod_${RandomGenerator.alphaNumeric(8)}`;
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const display_name = RandomGenerator.name();

  const body = {
    username,
    email,
    password,
    display_name,
  } satisfies ICommunityPortalModerator.ICreate;

  // 2. Call join endpoint
  const output: ICommunityPortalModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body,
    });

  // 3. Validate response shape
  typia.assert(output);

  // 4. Business assertions
  TestValidator.equals(
    "returned username matches requested username",
    output.username,
    username,
  );

  // display_name is optional in response; if provided in response, it must match
  if (output.display_name !== undefined && output.display_name !== null) {
    TestValidator.equals(
      "returned display_name matches requested display_name",
      output.display_name,
      display_name,
    );
  }

  // Token container presence and basic checks
  TestValidator.predicate(
    "access token is returned",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is returned",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "access token expiry present",
    typeof output.token.expired_at === "string" &&
      output.token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refresh token expiry present",
    typeof output.token.refreshable_until === "string" &&
      output.token.refreshable_until.length > 0,
  );

  // Ensure id exists and is non-empty (typia already validated uuid format)
  TestValidator.predicate(
    "returned id is present",
    typeof output.id === "string" && output.id.length > 0,
  );
}
