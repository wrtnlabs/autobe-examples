import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberEmailVerification";
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

export async function test_api_email_verification_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Get member A's verification tokens to obtain a verification ID
  const memberAVerifications =
    await api.functional.todoApp.member.email_verifications.index(
      memberAConnection,
      {
        body: {
          memberId: memberA.id,
        } satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(memberAVerifications);
  // Ensure we have at least one verification token
  TestValidator.predicate(
    "member A has verification tokens",
    () => memberAVerifications.data.length > 0,
  );
  const memberAVerificationId = memberAVerifications.data[0].id;
  // 3. Create member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberB);
  // 4. Try to access member A's verification token as member B (should fail with 403)
  await TestValidator.error(
    "member B cannot access member A's verification token",
    async () => {
      await api.functional.todoApp.member.email_verifications.at(
        memberBConnection,
        {
          verificationId: memberAVerificationId,
        },
      );
    },
  );
  // 5. Verify data isolation - member B's own verification tokens are not affected
  const memberBVerifications =
    await api.functional.todoApp.member.email_verifications.index(
      memberBConnection,
      {
        body: {
          memberId: memberB.id,
        } satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(memberBVerifications);
}
