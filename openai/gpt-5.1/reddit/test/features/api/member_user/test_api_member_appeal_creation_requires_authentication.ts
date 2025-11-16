import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";

/**
 * Verify that creating a moderation appeal requires memberUser authentication.
 *
 * Business goal: Ensure that the community-platform appeal creation endpoint
 * does not allow anonymous users (no memberUser token) to submit appeals, even
 * when the request body is structurally valid. This protects the moderation
 * system from unauthenticated abuse and enforces that only logged-in member
 * accounts can contest moderation actions.
 *
 * Test focus:
 *
 * - Only the authentication boundary of POST
 *   /communityPlatform/memberUser/appeals
 * - We do NOT check HTTP status codes or error payload schemas, because test
 *   infrastructure forbids explicit status-code or error-body validation.
 * - We only assert that the API call fails when unauthenticated.
 *
 * High-level steps:
 *
 * 1. Prepare a fresh unauthenticated connection by cloning the given connection
 *    and clearing headers so there is no Authorization token.
 * 2. Construct a syntactically valid ICommunityPlatformAppeal.ICreate payload:
 *
 *    - Moderation_action_id: a random UUID string
 *    - Justification: some non-empty random paragraph text
 * 3. Call api.functional.communityPlatform.memberUser.appeals.create with the
 *    unauthenticated connection and the valid body inside TestValidator.error,
 *    asserting that an error is thrown (authentication failure at runtime).
 *
 * Rationale on not using /auth/memberUser/join dependency directly: The
 * scenario dependency explains how authenticated memberUser context is normally
 * established, but this specific test targets the anonymous case. Therefore we
 * intentionally do NOT call join() on the test connection. This ensures the
 * connection truly represents an unauthenticated actor.
 */
export async function test_api_member_appeal_creation_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Create an unauthenticated connection clone with empty headers to
  // guarantee that no Authorization token is present. Per policy, we are only
  // allowed to set headers at creation time and must not manipulate them
  // afterward.
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Build a syntactically valid appeal creation payload using the exact
  // DTO type ICommunityPlatformAppeal.ICreate.
  const body = {
    moderation_action_id: typia.random<string & tags.Format<"uuid">>(),
    justification: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  // 3. Invoke the appeal creation endpoint with the unauthenticated
  // connection and assert that it fails. We don't care about the specific
  // error type or status code, only that an error is thrown for missing auth.
  await TestValidator.error(
    "appeal creation must fail when unauthenticated",
    async () => {
      await api.functional.communityPlatform.memberUser.appeals.create(
        unauthenticated,
        { body },
      );
    },
  );
}
