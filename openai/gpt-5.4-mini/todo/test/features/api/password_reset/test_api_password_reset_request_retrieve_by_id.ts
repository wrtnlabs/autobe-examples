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

export async function test_api_password_reset_request_retrieve_by_id(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  const resetId = typia.random<string & tags.Format<"uuid">>();
  const reset = await api.functional.todoApp.member.password_resets.at(
    memberConnection,
    {
      resetId,
    },
  );
  typia.assert(reset);
  TestValidator.equals(
    "password reset id should be preserved",
    reset.id,
    resetId,
  );
  TestValidator.equals(
    "password reset should belong to the authenticated member",
    reset.todoAppMemberId,
    member.id,
  );
  TestValidator.predicate(
    "password reset token should be stored",
    reset.token.length > 0,
  );
  TestValidator.predicate(
    "password reset expiredAt should be stored",
    reset.expiredAt.length > 0,
  );
  TestValidator.predicate(
    "password reset createdAt should be stored",
    reset.createdAt.length > 0,
  );
  TestValidator.predicate(
    "password reset updatedAt should be stored",
    reset.updatedAt.length > 0,
  );
  TestValidator.equals(
    "password reset deletedAt should be null for an active request",
    reset.deletedAt,
    null,
  );
  TestValidator.predicate(
    "password reset member summary should exist",
    reset.member !== null && reset.member !== undefined,
  );
}
