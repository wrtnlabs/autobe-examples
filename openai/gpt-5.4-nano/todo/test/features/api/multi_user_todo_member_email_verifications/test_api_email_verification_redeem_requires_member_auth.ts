import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_email_verifications_verify_email } from "../../../generate/generate_random_multi_user_todo_member_email_verifications_verify_email";
import { prepare_random_multi_user_todo_member_email_verification } from "../../../prepare/prepare_random_multi_user_todo_member_email_verification";

export async function test_api_email_verification_redeem_requires_member_auth(
  connection: api.IConnection,
): Promise<void> {
  const unauthConnection: api.IConnection = { host: connection.host };
  const token = typia.random<string & tags.MinLength<1>>();
  await TestValidator.httpError(
    "redeem requires member authentication",
    [401, 403],
    async () =>
      await api.functional.multiUserTodo.member.email_verifications.verifyEmail(
        unauthConnection,
        {
          body: {
            token,
          } satisfies IMultiUserTodoMemberEmailVerification.ICreate,
        },
      ),
  );
  // Verify system still allows a normal authenticated redemption afterwards.
  // (This doesn't prove which records changed by the unauthenticated call,
  // but it ensures no unexpected global corruption occurred.)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const verified =
    await generate_random_multi_user_todo_member_email_verifications_verify_email(
      memberConnection,
      {},
    );
  typia.assert(verified);
}
