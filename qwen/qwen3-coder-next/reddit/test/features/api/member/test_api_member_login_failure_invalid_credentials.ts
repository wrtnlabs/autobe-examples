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

export async function test_api_member_login_failure_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a valid member account first
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberData });
  typia.assert(memberConnection);
  // 2. Attempt login with correct email but incorrect password
  await TestValidator.error(
    "login should fail with invalid password",
    async () => {
      await api.functional.redditLike.auth.member.login(memberConnection, {
        body: {
          email: memberData.email,
          password: "wrongpassword123", // Invalid password
        } satisfies IRedditLikeMember.ILogin,
      });
    },
  );
  // 3. Attempt login with invalid email format
  await TestValidator.error(
    "login should fail with invalid email format",
    async () => {
      await api.functional.redditLike.auth.member.login(memberConnection, {
        body: {
          email: "invalid-email-format", // Invalid email format
          password: memberData.password,
        } satisfies IRedditLikeMember.ILogin,
      });
    },
  );
  // 4. Attempt login with completely invalid credentials (email not in system)
  await TestValidator.error(
    "login should fail with non-existent email",
    async () => {
      await api.functional.redditLike.auth.member.login(memberConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(), // Random email not registered
          password: memberData.password,
        } satisfies IRedditLikeMember.ILogin,
      });
    },
  );
}
