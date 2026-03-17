import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberEmailVerification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_email_verification_filter_by_purpose(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member (creates registration-purpose email verification)
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(auth);
  // 2. Query with purpose filter = 'registration'
  const registrationVerifications =
    await api.functional.multiUserTodo.member.email_verifications.index(
      memberConnection,
      {
        body: {
          purpose: "registration",
          page: 1,
          limit: 20,
        } satisfies IMultiUserTodoMemberEmailVerification.IRequest,
      },
    );
  typia.assert(registrationVerifications);
  // 3. Verify registration-purpose verifications are returned
  TestValidator.predicate(
    "registration verifications should exist",
    registrationVerifications.data.length > 0,
  );
  TestValidator.predicate(
    "all returned verifications should have registration purpose",
    registrationVerifications.data.every((v) => v.purpose === "registration"),
  );
  // 4. Query with purpose filter = 'email_change'
  const emailChangeVerifications =
    await api.functional.multiUserTodo.member.email_verifications.index(
      memberConnection,
      {
        body: {
          purpose: "email_change",
          page: 1,
          limit: 20,
        } satisfies IMultiUserTodoMemberEmailVerification.IRequest,
      },
    );
  typia.assert(emailChangeVerifications);
  // 5. Verify no email_change-purpose verifications are returned
  TestValidator.equals(
    "email_change verifications should be empty",
    emailChangeVerifications.data.length,
    0,
  );
}
