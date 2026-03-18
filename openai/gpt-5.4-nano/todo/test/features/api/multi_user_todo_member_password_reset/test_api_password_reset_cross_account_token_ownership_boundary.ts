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

export async function test_api_password_reset_cross_account_token_ownership_boundary(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberBEmail = typia.random<string & tags.Format<"email">>();

  // IMultiUserTodoMember.IJoin expects `password` to be boolean | undefined
  // based on compiler errors.
  const memberAPassword = typia.random<boolean>();
  const memberBPassword = typia.random<boolean>();

  await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    } satisfies IMultiUserTodoMember.IJoin,
  });

  await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    } satisfies IMultiUserTodoMember.IJoin,
  });

  const resetTokenCandidateForA = typia.random<string & tags.MinLength<1>>();
  const resetTokenCandidateForB = typia.random<string & tags.MinLength<1>>();
  const newPasswordForA = typia.random<string & tags.MinLength<1>>();
  const newPasswordForB = typia.random<string & tags.MinLength<1>>();

  // Variant 1: Use token candidate for A while authenticated as B.
  const resultAB =
    await api.functional.multiUserTodo.member.password_resets.processPasswordResets(
      memberBConnection,
      {
        body: {
          token: resetTokenCandidateForA,
          password: newPasswordForA,
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(resultAB);

  // Variant 2: Use token candidate for B while authenticated as A.
  const resultBA =
    await api.functional.multiUserTodo.member.password_resets.processPasswordResets(
      memberAConnection,
      {
        body: {
          token: resetTokenCandidateForB,
          password: newPasswordForB,
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(resultBA);

  TestValidator.equals(
    "reset using invalid token candidate should not succeed (A->B)",
    resultAB.success,
    false,
  );
  TestValidator.equals(
    "reset using invalid token candidate should not succeed (B->A)",
    resultBA.success,
    false,
  );
}
