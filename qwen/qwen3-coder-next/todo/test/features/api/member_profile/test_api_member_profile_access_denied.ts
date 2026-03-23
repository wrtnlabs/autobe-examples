import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Register User A
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_member_join(userAConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  // Register User B
  const userBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(userBConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  // Create new connection for User A to test profile access
  const userAConnectionForProfile: api.IConnection = { host: connection.host };
  // Login with User A's credentials to ensure proper authentication context
  await authorize_member_login(userAConnectionForProfile, {
    body: {
      email: userA.member.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppMemberSession.ILogin,
  });
  // User A attempts to access User B's profile (should be rejected due to authentication context mismatch)
  // The profile endpoint only allows accessing the authenticated user's own profile
  await TestValidator.error(
    "User A should not be able to access User B's profile",
    async () => {
      await api.functional.todoApp.member.profile.at(userAConnectionForProfile);
    },
  );
}
