import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_profile_isolation_between_accounts(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test member join-time account isolation by verifying that two distinct
   * member registrations create separate private profile identities.
   *
   * Validates that:
   * 1. The returned private profile identifiers (id and multi_user_todo_user_id)
   *    differ across accounts.
   * 2. The returned display_name is the same as each account's input.
   * 3. Each join response includes a valid authorization token pair (access /
   *    refresh) with expiration metadata.
   */
  // 1. Member A join.
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberADisplayName = RandomGenerator.name();
  const memberAPassword = typia.random<
    string & tags.MinLength<1> & tags.Format<"password">
  >();
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      display_name: memberADisplayName,
      password: memberAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  // 2. Member B join.
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBDisplayName = RandomGenerator.name();
  const memberBPassword = typia.random<
    string & tags.MinLength<1> & tags.Format<"password">
  >();
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      display_name: memberBDisplayName,
      password: memberBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberB);
  // 3. Validate isolation across accounts.
  TestValidator.notEquals(
    "multi_user_todo_user_id should differ between members",
    memberA.multi_user_todo_user_id,
    memberB.multi_user_todo_user_id,
  );
  TestValidator.notEquals(
    "profile id should differ between members",
    memberA.id,
    memberB.id,
  );
  // 4. Validate per-account display name.
  TestValidator.equals(
    "member A display_name should match input",
    memberA.display_name,
    memberADisplayName,
  );
  TestValidator.equals(
    "member B display_name should match input",
    memberB.display_name,
    memberBDisplayName,
  );
  // 5. Validate token payload fields.
  const validateToken = (
    token: IMultiUserTodoUserProfile.IAuthorized["token"],
  ): void => {
    typia.assert(token);
    TestValidator.predicate(
      "access token should be non-empty",
      token.access.length > 0,
    );
    TestValidator.predicate(
      "refresh token should be non-empty",
      token.refresh.length > 0,
    );
  };
  validateToken(memberA.token);
  validateToken(memberB.token);
}
