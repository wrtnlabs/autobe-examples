import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";

/**
 * Validate refresh token rotation and reuse protection for moderator refresh
 * endpoint.
 *
 * Workflow:
 *
 * 1. Register a moderator-capable account via POST /auth/moderator/join
 * 2. Capture the initially issued refresh token (token1)
 * 3. Call POST /auth/moderator/refresh with token1 to receive rotated token
 *    (token2)
 * 4. Attempt to reuse token1 and assert the attempt is rejected (error thrown)
 * 5. Verify token2 is valid by calling refresh with token2 and asserting success
 *
 * Notes:
 *
 * - Server-side audit/log inspection is not possible with the provided SDK,
 *   therefore audit verification is omitted and documented as a limitation.
 */
export async function test_api_moderator_refresh_rejects_reused_refresh_token(
  connection: api.IConnection,
) {
  // 1) Create moderator-capable account
  const createBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!Test",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumModerator.ICreate;

  const joined: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });
  typia.assert(joined);

  // Extract initial refresh token
  const originalRefresh: string = joined.token.refresh;
  TestValidator.predicate(
    "original refresh token exists",
    typeof originalRefresh === "string" && originalRefresh.length > 0,
  );

  // 2) Use original refresh token to rotate
  const rotated: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: originalRefresh,
        session_id: null, // explicit null per schema allowance
      } satisfies IEconPoliticalForumModerator.IRefresh,
    });
  typia.assert(rotated);

  const rotatedRefresh: string = rotated.token.refresh;

  // Ensure rotated token differs from the original
  TestValidator.notEquals(
    "rotated refresh token must differ from original",
    rotatedRefresh,
    originalRefresh,
  );

  // 3) Attempt to reuse original refresh token -> must be rejected
  await TestValidator.error(
    "reusing an already-rotated refresh token should be rejected",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: originalRefresh,
          session_id: null,
        } satisfies IEconPoliticalForumModerator.IRefresh,
      });
    },
  );

  // 4) Verify rotated token is valid and can be used to obtain a fresh token
  const afterRotatedUse: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: rotatedRefresh,
        session_id: null,
      } satisfies IEconPoliticalForumModerator.IRefresh,
    });
  typia.assert(afterRotatedUse);

  TestValidator.predicate(
    "rotated token yields non-empty access token",
    typeof afterRotatedUse.token.access === "string" &&
      afterRotatedUse.token.access.length > 0,
  );

  // Cleanup note: No revoke/delete endpoints exist in the provided SDK
  // materials, so explicit cleanup is not performed here. Test environments
  // should run in isolated DBs or provide additional admin APIs to remove
  // created test records.
}
