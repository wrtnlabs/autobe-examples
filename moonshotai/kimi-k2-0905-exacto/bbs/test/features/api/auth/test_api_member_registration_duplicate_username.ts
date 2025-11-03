import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";

export async function test_api_member_registration_duplicate_username(
  connection: api.IConnection,
) {
  // First, create an initial member account with a unique username
  const uniqueUsername = RandomGenerator.alphabets(8) satisfies string &
    tags.MinLength<3> &
    tags.MaxLength<20> &
    tags.Pattern<"^[a-zA-Z0-9-]+$">;
  const initialEmail = typia.random<string & tags.Format<"email">>();

  const joinBody = {
    username: uniqueUsername,
    email: initialEmail,
    password: "TestPass123",
    href: "https://example.com/register",
    referrer: "https://example.com/",
    ip: "127.0.0.1",
  } satisfies IPoliticsBbsMember.IJoin;

  const firstMember: IPoliticsBbsMember.IAuthorized =
    await api.functional.auth.members.join(connection, {
      body: joinBody,
    });
  typia.assert(firstMember);

  // Verify the first member was created successfully
  TestValidator.equals(
    "first member username matches",
    firstMember.username,
    uniqueUsername,
  );
  TestValidator.equals(
    "first member email matches",
    firstMember.email,
    initialEmail,
  );

  // Now attempt to create another account with the same username
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const duplicateUsernameBody = {
    username: uniqueUsername, // Same username as first member
    email: secondEmail,
    password: "SecondPass123",
    href: "https://example.com/register",
    referrer: "https://example.com/",
    ip: "127.0.0.1",
  } satisfies IPoliticsBbsMember.IJoin;

  // This should fail with duplicate username error
  await TestValidator.error(
    "duplicate username registration should fail",
    async () => {
      await api.functional.auth.members.join(connection, {
        body: duplicateUsernameBody,
      });
    },
  );
}
