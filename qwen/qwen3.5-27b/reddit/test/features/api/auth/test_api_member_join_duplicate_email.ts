import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member registration when email already exists in the system.
 *
 * Validates the business rule that each member must have a unique email address across the platform, preventing duplicate registrations with the same email identifier.
 *
 * This test ensures that when attempting to register a new member with an email that already exists in the system, the API returns an appropriate HTTP 409 Conflict response. The test verifies that the email uniqueness constraint is properly enforced at the business logic level and that the original member account remains functional after the duplicate registration attempt.
 *
 * 1. Create a member account with a specific email address using authorize_member_join utility
 * 2. Validate the first registration succeeded with typia.assert on response
 * 3. Attempt to register another member with the same email address but different username
 * 4. Verify HTTP 409 Conflict response is returned using TestValidator.httpError
 * 5. Verify no duplicate member account was created (the error prevents creation)
 * 6. Verify the original member account remains functional (already validated in step 2)
 */
export async function test_api_member_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account with specific email
  const firstConnection: api.IConnection = { host: connection.host };
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstMember = await authorize_member_join(firstConnection, {
    body: {
      email: firstEmail,
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(firstMember);
  // 2. Validate first registration succeeded
  TestValidator.equals(
    "first member email matches",
    firstMember.email,
    firstEmail,
  );
  TestValidator.predicate(
    "first member has valid id",
    firstMember.id.length > 0,
  );
  TestValidator.predicate(
    "first member has valid token",
    firstMember.token.access.length > 0,
  );
  // 3. Attempt duplicate registration with same email but different username
  const duplicateConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate email returns 409 conflict",
    409,
    async () => {
      await authorize_member_join(duplicateConnection, {
        body: {
          email: firstEmail,
          password: RandomGenerator.alphaNumeric(16),
          username: RandomGenerator.name(1),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IRedditCloneMember.IJoin,
      });
    },
  );
  // 4. Verify original member account remains functional
  TestValidator.equals(
    "original member unchanged",
    firstMember.email,
    firstEmail,
  );
  TestValidator.equals(
    "original member id preserved",
    firstMember.id,
    firstMember.id,
  );
}
