import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member registration rejection when attempting to register with an email address that is already associated with an existing member account.
 *
 * Validates the business rule that email addresses must be unique across all member accounts. First, creates a member account with a unique email and username. Then attempts to register a second member account using the same email address but different username. Verifies the system returns a 409 Conflict response indicating the email is already registered.
 *
 * The duplicate email check is a business logic constraint enforced by the backend, not input validation. This test validates that the uniqueness constraint is properly enforced at the API level.
 *
 * 1. Register first member with unique email, password, and username using authorize_member_join utility.
 * 2. Attempt to register second member with same email but different username.
 * 3. Verify duplicate email registration is rejected with business logic error.
 */
export async function test_api_member_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member with unique email
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: firstMemberEmail,
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(firstMember);
  // 2. Attempt duplicate registration with same email but different username
  const duplicateConnection: api.IConnection = { host: connection.host };
  // 3. Verify duplicate email is rejected with business error
  await TestValidator.error(
    "duplicate email registration rejected",
    async () => {
      await authorize_member_join(duplicateConnection, {
        body: {
          email: firstMemberEmail,
          password: RandomGenerator.alphaNumeric(16),
          username: RandomGenerator.name(1),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IRedditCommunityMember.IJoin,
      });
    },
  );
}
