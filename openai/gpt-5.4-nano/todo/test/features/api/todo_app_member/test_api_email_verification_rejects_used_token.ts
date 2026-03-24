import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_rejects_used_token(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: undefined,
  } satisfies ITodoAppMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Use the provided opaque token string from the authorized payload
  // as the verification token candidate.
  const verificationToken: ITodoAppMember.IEmailVerification["token"] =
    authorized.token.access;
  const payload: ITodoAppMember.IEmailVerification = {
    token: verificationToken,
  };
  const result1 =
    await api.functional.todoApp.member.email_verifications.verifyEmail(
      memberConnection,
      { body: payload },
    );
  typia.assert(result1);
  TestValidator.equals(
    "first verification should succeed",
    result1.success,
    true,
  );
  // Concurrency intent: immediately retry reuse after successful consumption.
  await TestValidator.error(
    "reusing consumed email verification token should reject",
    async () => {
      const result2 =
        await api.functional.todoApp.member.email_verifications.verifyEmail(
          memberConnection,
          { body: payload },
        );
      typia.assert(result2);
    },
  );
}
