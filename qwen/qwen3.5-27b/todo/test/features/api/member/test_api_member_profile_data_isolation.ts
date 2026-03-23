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

export async function test_api_member_profile_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test member profile data isolation and privacy.
   *
   * This test validates that:
   * 1. A member can register successfully
   * 2. The authenticated member can access their own profile
   * 3. The profile response contains only safe, non-sensitive data
   * 4. The response structure matches IMultiUserTodoMember.ISummary
   */
  // 1. Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve the authenticated member's profile
  const profile =
    await api.functional.multiUserTodo.member.profile.at(memberConnection);
  typia.assert(profile);
  // 3. Validate profile data isolation
  // Verify that the profile belongs to the authenticated member
  TestValidator.equals("profile id matches", profile.id, authorized.id);
  TestValidator.equals(
    "profile email matches",
    profile.email,
    authorized.email,
  );
  TestValidator.equals(
    "profile display name matches",
    profile.display_name,
    authorized.display_name,
  );
  TestValidator.equals(
    "profile created_at matches",
    profile.created_at,
    authorized.created_at,
  );
  // 4. Verify timestamps are valid
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(profile.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(profile.updated_at);
    return !isNaN(date.getTime());
  });
  // 5. Verify that password_hash is NOT exposed (it should not exist in ISummary)
  TestValidator.predicate("password_hash not exposed", () => {
    return !("password_hash" in profile);
  });
}
