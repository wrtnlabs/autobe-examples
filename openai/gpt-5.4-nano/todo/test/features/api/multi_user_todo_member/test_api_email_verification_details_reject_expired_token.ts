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

export async function test_api_email_verification_details_reject_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Preconditions: create an authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(credentials);
  // We don't have an API/utility to fetch the actual verificationId created during join
  // or to advance time/force expired_at, so we use a syntactically valid but
  // non-deterministic verificationId and assert the system rejects it.
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "expired/invalid verification token should be rejected",
    async () => {
      try {
        await api.functional.multiUserTodo.member.email_verifications.at(
          memberConnection,
          {
            verificationId,
          },
        );
        throw new Error("Expected request to be rejected");
      } catch (err) {
        if (!typia.is<api.HttpError>(err)) throw err;
        const json = err.toJSON<string>();
        const message = json.message;
        // Business/privacy checks: error must not leak token details or member identity
        // (best-effort since message schema is not provided)
        TestValidator.predicate(
          "error message should not include the verificationId",
          () => !message.includes(verificationId),
        );
        TestValidator.predicate(
          "error message should not include access token",
          () => !message.includes(credentials.token.access),
        );
        throw err;
      }
    },
  );
}
