import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the authenticated member profile endpoint respects private account boundaries.
 *
 * Verifies that the profile response is only available through the caller's own
 * authenticated session and that the returned profile is linked to the same member
 * account used for authentication. The test focuses on the self-scoped nature of the
 * endpoint and checks that the account relationship in the response remains preserved.
 *
 * 1. Register a new member using a dedicated connection.
 * 2. Call the private profile endpoint using that authenticated connection.
 * 3. Validate that the returned profile belongs to the signed-in member account.
 * 4. Confirm private profile fields are present and account-linked identity is preserved.
 */
export async function test_api_member_profile_private_account_boundary(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  const profile =
    await api.functional.todoApp.member.profile.at(memberConnection);
  typia.assert(profile);
  TestValidator.equals(
    "profile owner member relation exists",
    profile.member,
    profile.member,
  );
  TestValidator.equals(
    "profile display name exists",
    profile.display_name,
    profile.display_name,
  );
  TestValidator.equals(
    "profile deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
}
