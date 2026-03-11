import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that email addresses must be unique across all member accounts.
 *
 * First registration with a unique email should succeed with proper validation.
 * Second attempt with the same email should fail with appropriate business
 * logic error (email already registered), validating the core requirement
 * that each user must have a unique email for account identification.
 */
export async function test_api_member_join_unique_email_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Generate test data - create a unique email for this test
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Create first member connection and join successfully
  const firstConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstConnection, {
    body: {
      email: duplicateEmail,
      password: password,
      display_name: displayName,
      href: href,
      referrer: referrer,
    },
  });
  typia.assert(firstMember);
  // Validate first registration succeeded
  TestValidator.equals(
    "first member email matches input",
    firstMember.email,
    duplicateEmail,
  );
  TestValidator.equals(
    "first member display name matches input",
    firstMember.display_name,
    displayName,
  );
  TestValidator.predicate(
    "first member has valid ID",
    firstMember.id.length > 0,
  );
  TestValidator.predicate(
    "first member has token",
    firstMember.token.access.length > 0,
  );
  // Create second member connection and attempt to join with the same email
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate email should be rejected", async () => {
    await authorize_member_join(secondConnection, {
      body: {
        email: duplicateEmail,
        password: password,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  });
  // Additional validation: different email should succeed
  const thirdConnection: api.IConnection = { host: connection.host };
  const thirdMember = await authorize_member_join(thirdConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(thirdMember);
  TestValidator.predicate(
    "third member has valid ID",
    thirdMember.id.length > 0,
  );
  TestValidator.notEquals(
    "third member ID differs from first",
    thirdMember.id,
    firstMember.id,
  );
}
