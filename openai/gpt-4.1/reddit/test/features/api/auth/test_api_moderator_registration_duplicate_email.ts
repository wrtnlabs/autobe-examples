import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator registration fails on duplicate email.
 *
 * 1. Randomize all properties for first moderator registration body, including
 *    unique email.
 * 2. Register first moderator (should succeed and return IAuthorized).
 * 3. Prepare a second registration with the exact same email, other fields
 *    randomized.
 * 4. Attempt to register again (should throw error for email duplication).
 */
export async function test_api_moderator_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Prepare unique valid email and initial moderator registration body
  const usedEmail = typia.random<string & tags.Format<"email">>();
  const createBody = {
    email: usedEmail,
    password: RandomGenerator.alphaNumeric(12),
    status: "active",
    business_status: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies ICommunityPlatformModerator.ICreate;

  // Step 2: Register the initial moderator account
  const originalAuth = await api.functional.auth.moderator.join(connection, {
    body: createBody,
  });
  typia.assert(originalAuth);

  // Step 3: Prepare duplicate registration body (same email, rest randomized)
  const dupBody = {
    email: usedEmail,
    password: RandomGenerator.alphaNumeric(16),
    status: RandomGenerator.pick([
      "active",
      "suspended",
      "pending",
      "banned",
    ] as const),
    business_status: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies ICommunityPlatformModerator.ICreate;

  // Step 4: Attempt to join with duplicate email, expect error
  await TestValidator.error(
    "duplicate email should fail moderator registration",
    async () => {
      await api.functional.auth.moderator.join(connection, { body: dupBody });
    },
  );
}
