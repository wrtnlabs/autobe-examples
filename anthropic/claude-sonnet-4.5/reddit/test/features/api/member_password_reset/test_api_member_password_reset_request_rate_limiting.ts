import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test the rate limiting mechanism for password reset requests.
 *
 * This test validates that the system enforces a rate limit of 3 password reset
 * requests per hour for the same email address to prevent email spam abuse. The
 * test creates a member account and then submits multiple password reset
 * requests in rapid succession to verify that the fourth request is rejected
 * due to rate limiting.
 *
 * Test workflow:
 *
 * 1. Create a member account with a valid email address
 * 2. Submit first password reset request - should succeed
 * 3. Submit second password reset request - should succeed
 * 4. Submit third password reset request - should succeed
 * 5. Submit fourth password reset request - should fail with rate limit error
 * 6. Validate that successful requests return generic confirmation messages
 */
export async function test_api_member_password_reset_request_rate_limiting(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Submit first password reset request - should succeed
  const firstRequest =
    await api.functional.auth.member.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IRedditLikeMember.IRequestPasswordReset,
      },
    );
  typia.assert(firstRequest);
  TestValidator.equals(
    "first request should succeed",
    firstRequest.success,
    true,
  );

  // Step 3: Submit second password reset request - should succeed
  const secondRequest =
    await api.functional.auth.member.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IRedditLikeMember.IRequestPasswordReset,
      },
    );
  typia.assert(secondRequest);
  TestValidator.equals(
    "second request should succeed",
    secondRequest.success,
    true,
  );

  // Step 4: Submit third password reset request - should succeed
  const thirdRequest =
    await api.functional.auth.member.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IRedditLikeMember.IRequestPasswordReset,
      },
    );
  typia.assert(thirdRequest);
  TestValidator.equals(
    "third request should succeed",
    thirdRequest.success,
    true,
  );

  // Step 5: Submit fourth password reset request - should fail due to rate limiting
  await TestValidator.error(
    "fourth request should fail due to rate limiting",
    async () => {
      await api.functional.auth.member.password.reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: memberEmail,
          } satisfies IRedditLikeMember.IRequestPasswordReset,
        },
      );
    },
  );

  // Step 6: Validate that all successful requests returned generic messages
  TestValidator.predicate(
    "first request message should be generic",
    typeof firstRequest.message === "string" && firstRequest.message.length > 0,
  );
  TestValidator.predicate(
    "second request message should be generic",
    typeof secondRequest.message === "string" &&
      secondRequest.message.length > 0,
  );
  TestValidator.predicate(
    "third request message should be generic",
    typeof thirdRequest.message === "string" && thirdRequest.message.length > 0,
  );
}
