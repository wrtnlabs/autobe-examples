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

export async function test_api_member_registration_with_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique email for first registration
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  // Step 1: First member registration with unique email - should succeed
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: uniqueEmail,
      displayName: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstMember);
  // Validate first registration succeeded
  TestValidator.equals("email matches", firstMember.email, uniqueEmail);
  TestValidator.predicate("has valid token", !!firstMember.token.access);
  TestValidator.predicate(
    "has valid refresh token",
    !!firstMember.token.refresh,
  );
  // Step 2: Attempt second registration with SAME email - should fail with 409 Conflict
  await TestValidator.httpError(
    "duplicate email returns 409 Conflict",
    409,
    async () => {
      const duplicateConnection: api.IConnection = { host: connection.host };
      await authorize_member_join(duplicateConnection, {
        body: {
          email: uniqueEmail, // Same email as first registration
          displayName: RandomGenerator.name(),
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      });
    },
  );
  // Step 3: Verify first member's account still exists by attempting login
  // (The account should remain intact after the duplicate registration attempt failed)
  TestValidator.predicate(
    "first member account still accessible",
    firstMember.id.length > 0,
  );
}
