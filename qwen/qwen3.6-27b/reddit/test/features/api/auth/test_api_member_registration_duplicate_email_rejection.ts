import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test registration rejection when attempting to register with an email already associated with an existing active account.
 *
 * Validates the email uniqueness constraint enforced at the database level for member registration. The system must prevent duplicate active accounts by rejecting new registrations that use an email address already registered. This ensures platform integrity and prevents account conflicts.
 *
 * 1. Creates a new member account with a specific email address and valid credentials.
 * 2. Attempts a second registration using the identical email address.
 * 3. Validates that the system rejects the duplicate registration request with a 409 Conflict HTTP error.
 */
export async function test_api_member_registration_duplicate_email_rejection(
  connection: api.IConnection,
) {
  // 1. Prepare registration body with a fixed email to test uniqueness constraint
  const joinBody = {
    email: "duplicate_email_test@example.com",
    password: "SecurePass123!",
    username: RandomGenerator.name(1),
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies IREdditLikeCommunityMember.IJoin;
  // 2. First registration succeeds and creates the account
  const memberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(firstMember);
  // 3. Attempt duplicate registration with the same email
  // The system should reject this with a 409 Conflict due to database unique constraint
  const duplicateConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("duplicate email rejection", 409, async () => {
    await api.functional.redditLikeCommunity.auth.member.join(
      duplicateConnection,
      { body: joinBody },
    );
  });
}
