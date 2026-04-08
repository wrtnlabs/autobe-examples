import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
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

export async function test_api_password_reset_request_returns_owner_summary(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a password reset request returns the owner relation as a summary.
   *
   * Verifies the private member password reset retrieval flow by authenticating a
   * member account and then requesting a password reset record by identifier.
   * The response is validated as a full password reset DTO and checked to ensure
   * the owner relation is present only as the schema-defined member summary.
   *
   * This scenario focuses on privacy boundaries in the private member area. The
   * test confirms that the response includes the password reset token and
   * expiration metadata, while the linked member is exposed only through the
   * summary relation defined by the schema.
   *
   * 1. Authenticate a member using an isolated connection.
   * 2. Request a password reset record by resetId.
   * 3. Validate the returned record and its owner summary relation.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  const resetId = typia.random<string & tags.Format<"uuid">>();
  const output = await api.functional.todoApp.member.password_resets.at(
    memberConnection,
    { resetId },
  );
  typia.assert(output);
  TestValidator.predicate(
    "password reset token should be present",
    output.token.length > 0,
  );
  TestValidator.predicate(
    "password reset expiration should be present",
    output.expiredAt.length > 0,
  );
  TestValidator.predicate(
    "password reset owner summary should exist",
    output.member !== null && output.member !== undefined,
  );
}
