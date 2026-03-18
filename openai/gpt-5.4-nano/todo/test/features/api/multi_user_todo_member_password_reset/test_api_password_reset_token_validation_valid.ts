import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_token_validation_valid(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });

  const initialTokenRequest: IMultiUserTodoMemberPasswordReset.IRequest = {
    token: typia.random<string & tags.MinLength<1>>(),
    password: typia.random<string & tags.MinLength<1>>(),
    page: null,
    limit: null,
  };

  const resetProcess =
    await api.functional.multiUserTodo.member.password_resets.processPasswordResets(
      memberConnection,
      {
        body: initialTokenRequest,
      },
    );
  typia.assert(resetProcess);

  const resetId = typia.assert<
    string &
      tags.MinLength<1> &
      tags.MaxLength<2048> &
      tags.Format<"uri"> &
      tags.ContentMediaType<"application/json">
  >(initialTokenRequest.token);

  const issuedAt = new Date();

  const validation1 =
    await api.functional.multiUserTodo.member.password_resets.at(
      memberConnection,
      {
        resetId,
      },
    );
  typia.assert(validation1);

  TestValidator.equals(
    "resetId matches provided token",
    validation1.resetId,
    resetId,
  );
  TestValidator.equals("token is valid", validation1.isValid, true);

  const expiresAtMs = Date.parse(validation1.expiresAt);
  TestValidator.predicate(
    "expiresAt is in the future relative to issuance",
    expiresAtMs > issuedAt.getTime(),
  );

  const allowedKeys = new Set(["resetId", "expiresAt", "isValid"] as const);
  TestValidator.predicate(
    "privacy: response contains only token validation fields",
    Object.keys(validation1).every((k) => allowedKeys.has(k as never)),
  );

  const nowMs = Date.now();
  const sleepMs = Math.max(0, expiresAtMs - nowMs - 250);
  if (sleepMs > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, sleepMs));
  }

  const validation2 =
    await api.functional.multiUserTodo.member.password_resets.at(
      memberConnection,
      {
        resetId,
      },
    );
  typia.assert(validation2);

  TestValidator.equals(
    "resetId matches provided token (2nd call)",
    validation2.resetId,
    resetId,
  );
  TestValidator.equals(
    "token remains valid (2nd call)",
    validation2.isValid,
    true,
  );
  TestValidator.equals(
    "expiresAt remains consistent",
    validation2.expiresAt,
    validation1.expiresAt,
  );
}
