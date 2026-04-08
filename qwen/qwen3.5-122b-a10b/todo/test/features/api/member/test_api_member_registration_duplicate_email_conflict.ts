import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member registration failure when attempting to register with an already-registered email address.
 *
 * Validates the email uniqueness constraint by attempting to create a second member account with the same email as an existing account. The system must reject the duplicate registration with a 409 Conflict error, preventing multiple accounts from sharing the same email address.
 *
 * This test ensures that:
 * 1. Email addresses are unique across all member accounts
 * 2. Duplicate registration attempts are properly rejected
 * 3. The appropriate error response is returned for business logic violations
 *
 * 1. Create first member account with random email and credentials.
 * 2. Attempt to create second member account with the same email.
 * 3. Validate that the second registration fails with a conflict error.
 */
export async function test_api_member_registration_duplicate_email_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(firstMember);
  // 2. Attempt to create second member account with same email
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate email should be rejected", async () => {
    await authorize_member_join(secondMemberConnection, {
      body: {
        email, // Same email as first member
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    });
  });
}
