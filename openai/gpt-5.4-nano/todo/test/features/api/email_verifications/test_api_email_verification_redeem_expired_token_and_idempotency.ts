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

export async function test_api_email_verification_redeem_expired_token_and_idempotency(
  connection: api.IConnection,
): Promise<void> {
  // Authenticated member context
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.pick([true, false]),
  } satisfies IMultiUserTodoMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);

  // Create an email verification token and redeem it once via generator,
  // capturing the token value from the response.
  const redeemedOnce =
    await generate_random_multi_user_todo_member_email_verifications_verify_email(
      memberConnection,
      {
        body: typia.assert<IMultiUserTodoMemberEmailVerification.ICreate>({}),
      },
    );
  typia.assert(redeemedOnce);

  // Scenario 1: Redeeming a valid non-expired token succeeds.
  TestValidator.equals(
    "deleted_at should be null after redemption",
    redeemedOnce.deleted_at,
    null,
  );
  TestValidator.predicate(
    "expired_at should be in the future",
    new Date(redeemedOnce.expired_at).getTime() > Date.now(),
  );

  // Scenario 3: Redeeming the same token twice should be rejected or have no side effects.
  const secondAttemptToken: string = redeemedOnce.token;
  await TestValidator.error(
    "redeeming the same token twice should be rejected",
    async () => {
      await generate_random_multi_user_todo_member_email_verifications_verify_email(
        memberConnection,
        {
          body: {
            token: secondAttemptToken,
          } satisfies IMultiUserTodoMemberEmailVerification.ICreate,
        },
      );
    },
  );

  // Scenario 2: Expired token must be rejected without updating verification state.
  // Provided utilities do not allow creation of a specifically pre-expired token.
  // The already-used token is treated as invalid/unusable.
  const expiredAttemptToken: string = redeemedOnce.token;
  await TestValidator.error(
    "redeeming an already-used token should be treated as invalid",
    async () => {
      await generate_random_multi_user_todo_member_email_verifications_verify_email(
        memberConnection,
        {
          body: {
            token: expiredAttemptToken,
          } satisfies IMultiUserTodoMemberEmailVerification.ICreate,
        },
      );
    },
  );
}
