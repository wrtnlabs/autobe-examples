import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_already_verified(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to get authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate a verification token for testing
  // In a real scenario, this would be sent via email or returned from registration
  // For E2E testing, we use a valid UUID format token
  const verificationToken: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. First verification attempt with valid token should succeed
  // Note: In production, this token would come from the email verification system
  const firstVerification =
    await api.functional.todoApp.member.email_verifications.verify(
      memberConnection,
      {
        body: {
          token: verificationToken,
        } satisfies ITodoAppMemberEmailVerification.IVerify,
      },
    );
  typia.assert(firstVerification);
  // 4. Second verification with the same token should fail with 404
  // This validates the idempotent behavior and security requirement
  await TestValidator.error(
    "already verified token should fail with 404",
    async () => {
      await api.functional.todoApp.member.email_verifications.verify(
        memberConnection,
        {
          body: {
            token: verificationToken,
          } satisfies ITodoAppMemberEmailVerification.IVerify,
        },
      );
    },
  );
}
