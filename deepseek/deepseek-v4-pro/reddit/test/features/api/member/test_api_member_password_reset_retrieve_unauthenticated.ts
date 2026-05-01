import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that unauthenticated access to password reset record retrieval is rejected.
 *
 * Validates that the password reset record retrieval endpoint properly enforces
 * authentication by rejecting requests with no authentication token. Password reset
 * records contain cryptographically sensitive tokens and must never be exposed to
 * anonymous visitors. The system must return HTTP 401 Unauthorized without leaking
 * any password reset data.
 *
 * 1. Generate random username and resetId path parameters.
 * 2. Send unauthenticated GET request to the password reset endpoint.
 * 3. Verify the request is rejected with HTTP 401.
 */
export async function test_api_member_password_reset_retrieve_unauthenticated(
  connection: api.IConnection,
): Promise<void> {
  await TestValidator.httpError(
    "unauthenticated access to password reset record",
    401,
    async () =>
      await api.functional.communityHub.members.password_resets.at(connection, {
        username: RandomGenerator.alphabets(8),
        resetId: typia.random<string & tags.Format<"uuid">>(),
      }),
  );
}
