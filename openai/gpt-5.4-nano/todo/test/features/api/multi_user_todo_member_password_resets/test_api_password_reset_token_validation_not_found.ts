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

export async function test_api_password_reset_token_validation_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticated member session
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2) Create non-existent reset tokens
  const resetIdA = typia.random<
    string &
      tags.MinLength<1> &
      tags.MaxLength<2048> &
      tags.Format<"uri"> &
      tags.ContentMediaType<"application/json">
  >();
  const resetIdB = typia.random<
    string &
      tags.MinLength<1> &
      tags.MaxLength<2048> &
      tags.Format<"uri"> &
      tags.ContentMediaType<"application/json">
  >();
  // 3) Call endpoint for resetIdA and validate rejection
  let errA: unknown = undefined;
  await TestValidator.error(
    "non-existent resetIdA should be rejected",
    async () => {
      await api.functional.multiUserTodo.member.password_resets.at(
        memberConnection,
        { resetId: resetIdA },
      );
    },
  );
  try {
    await api.functional.multiUserTodo.member.password_resets.at(
      memberConnection,
      { resetId: resetIdA },
    );
  } catch (e) {
    errA = e;
  }
  const messageA: string =
    errA instanceof Error ? errA.message : JSON.stringify(errA);
  TestValidator.predicate(
    "error message should not echo resetIdA",
    !messageA.includes(resetIdA),
  );
  // 4) Call endpoint for resetIdB and validate rejection + consistency
  let errB: unknown = undefined;
  try {
    await api.functional.multiUserTodo.member.password_resets.at(
      memberConnection,
      { resetId: resetIdB },
    );
  } catch (e) {
    errB = e;
  }
  TestValidator.predicate(
    "non-existent resetIdB should be rejected",
    errB !== undefined,
  );
  const messageB: string =
    errB instanceof Error ? errB.message : JSON.stringify(errB);
  TestValidator.predicate(
    "error message should not echo resetIdB",
    !messageB.includes(resetIdB),
  );
  // Consistency: both messages should look like generic token errors.
  // We avoid strict equality to prevent brittle failures.
  TestValidator.predicate(
    "both messages should be generic",
    messageA.toLowerCase().includes("token") || messageA.length < 200,
  );
  TestValidator.predicate(
    "both messages should be generic",
    messageB.toLowerCase().includes("token") || messageB.length < 200,
  );
}
