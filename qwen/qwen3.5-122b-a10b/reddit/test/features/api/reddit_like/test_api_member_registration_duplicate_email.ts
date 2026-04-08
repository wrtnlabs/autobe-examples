import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member registration rejection with duplicate email address.
 *
 * Validates that the system enforces email uniqueness constraint during member registration. When a user attempts to create a new account using an email address that is already registered, the system must reject the registration request with an appropriate error response.
 *
 * This test ensures the business rule that email addresses must be unique across all member accounts is properly enforced, preventing duplicate account creation with the same email credential.
 *
 * 1. Register first member account with unique email and username.
 * 2. Attempt to register second member account with the same email.
 * 3. Validate that second registration fails with appropriate error.
 */
export async function test_api_member_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member account successfully
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: firstEmail,
      password: "Password123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(firstMember);
  // 2. Attempt to register second member with same email (should fail)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await authorize_member_join(secondMemberConnection, {
        body: {
          email: firstEmail, // Same email as first member
          password: "DifferentPassword456!",
          username: RandomGenerator.name(1), // Different username
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: null,
        } satisfies IRedditLikeMember.IJoin,
      });
    },
  );
}
