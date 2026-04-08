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

export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful member registration for the private todo application.
   *
   * Validates that a new guest can create a unique private account, receive
   * the authenticated member snapshot, and obtain an authorization token pair.
   * The response is checked for correct identity propagation, private profile
   * presence, own todo summary inclusion, and account lifecycle metadata.
   *
   * 1. Create an actor-specific connection from the base connection.
   * 2. Register a new member with a unique email and password.
   * 3. Validate the authorized response and the returned account snapshot.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = `P@ssw0rd-${RandomGenerator.alphaNumeric(12)}`;
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "member email matches join input",
    authorized.email,
    email,
  );
  TestValidator.predicate(
    "member id is a non-empty uuid string",
    authorized.id.length > 0,
  );
  TestValidator.predicate(
    "profile object is returned",
    authorized.profile !== null && authorized.profile !== undefined,
  );
  TestValidator.predicate(
    "todo collection is returned as an array",
    Array.isArray(authorized.todos),
  );
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration exists",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token lifetime exists",
    authorized.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    authorized.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    authorized.updated_at.length > 0,
  );
  TestValidator.equals("new member is active", authorized.deleted_at, null);
}
