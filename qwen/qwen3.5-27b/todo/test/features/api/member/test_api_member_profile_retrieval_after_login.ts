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

export async function test_api_member_profile_retrieval_after_login(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test member profile retrieval after login.
   *
   * This test validates the complete authentication and profile access flow:
   * 1. Register a new member account
   * 2. Login with the registered credentials
   * 3. Retrieve the authenticated member's profile
   * 4. Verify profile data integrity and consistency
   */
  // Step 1: Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IMultiUserTodoMember.IJoin;
  const joinResult = await authorize_member_join(memberConnection, {
    body: registrationData,
  });
  typia.assert(joinResult);
  // Step 2: Create fresh connection and login
  const loginConnection: api.IConnection = { host: connection.host };
  const loginData = {
    email: registrationData.email,
    password: registrationData.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IMultiUserTodoMember.ILogin;
  const loginResult = await authorize_member_login(loginConnection, {
    body: loginData,
  });
  typia.assert(loginResult);
  // Step 3: Retrieve profile with authenticated connection
  const profile =
    await api.functional.multiUserTodo.member.profile.at(loginConnection);
  typia.assert(profile);
  // Step 4: Validate profile data integrity
  TestValidator.equals("profile id matches login", profile.id, loginResult.id);
  TestValidator.equals(
    "profile email matches registration",
    profile.email,
    registrationData.email,
  );
  TestValidator.equals(
    "profile display_name matches registration",
    profile.display_name,
    registrationData.display_name,
  );
  TestValidator.equals(
    "profile created_at matches join",
    profile.created_at,
    joinResult.created_at,
  );
  TestValidator.predicate(
    "profile updated_at exists",
    profile.updated_at !== null && profile.updated_at !== undefined,
  );
  TestValidator.predicate(
    "profile has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      profile.id,
    ),
  );
  TestValidator.predicate(
    "profile email is valid format",
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
      profile.email,
    ),
  );
}
