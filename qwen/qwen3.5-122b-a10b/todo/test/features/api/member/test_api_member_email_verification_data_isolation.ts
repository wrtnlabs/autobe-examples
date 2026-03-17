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

export async function test_api_member_email_verification_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A account
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAAuth);
  // 2. Create member B account
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberBAuth);
  // 3. Verify member A has their own email verification record
  const memberAVerifications =
    await api.functional.multiUserTodo.member.email_verifications.index(
      memberAConnection,
      {
        body: {} satisfies IMultiUserTodoMemberEmailVerification.IRequest,
      },
    );
  typia.assert(memberAVerifications);
  TestValidator.predicate(
    "member A has verification records",
    memberAVerifications.data.length > 0,
  );
  // 4. Verify member B can only see their own records (not member A's)
  const memberBVerifications =
    await api.functional.multiUserTodo.member.email_verifications.index(
      memberBConnection,
      {
        body: {} satisfies IMultiUserTodoMemberEmailVerification.IRequest,
      },
    );
  typia.assert(memberBVerifications);
  // 5. Validate data isolation - member B should not see member A's verifications
  TestValidator.predicate(
    "member B cannot access member A's verifications",
    memberBVerifications.data.every(
      (verification) => verification.member.id === memberBAuth.id,
    ),
  );
}
