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

export async function test_api_member_profile_retrieval_after_registration(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test member profile retrieval after registration.
   *
   * This test validates that a newly registered member can successfully
   * retrieve their own profile information. After registration via
   * POST /multiUserTodo/auth/member/join, the authenticated member
   * accesses their profile via GET /multiUserTodo/member/profile.
   */
  // 1. Create member connection from base connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Register new member with valid credentials
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
  // 3. Store registration data for validation
  const registrationEmail = authorized.email;
  const registrationDisplayName = authorized.display_name;
  // 4. Retrieve member profile using authenticated connection
  const profile =
    await api.functional.multiUserTodo.member.profile.at(memberConnection);
  typia.assert(profile);
  // 5. Validate profile matches registration data
  TestValidator.equals(
    "profile email matches registration",
    profile.email,
    registrationEmail,
  );
  TestValidator.equals(
    "profile display_name matches registration",
    profile.display_name,
    registrationDisplayName,
  );
  TestValidator.equals("profile id matches", profile.id, authorized.id);
  // 6. Validate timestamps exist and are valid
  TestValidator.predicate(
    "created_at is valid date-time",
    profile.created_at !== undefined && profile.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    profile.updated_at !== undefined && profile.updated_at !== null,
  );
}
