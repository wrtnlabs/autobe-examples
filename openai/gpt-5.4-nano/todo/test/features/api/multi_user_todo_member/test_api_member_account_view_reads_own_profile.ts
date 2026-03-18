import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_account_view_reads_own_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A join
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAAuthorized);
  // 2) Member A reads own profile
  const profileA1 =
    await api.functional.multiUserTodo.member.account.at(memberAConnection);
  typia.assert(profileA1);
  TestValidator.equals(
    "memberId matches A",
    profileA1.memberId,
    memberAAuthorized.id,
  );
  // 3) Verify read-only by repeating
  const profileA2 =
    await api.functional.multiUserTodo.member.account.at(memberAConnection);
  typia.assert(profileA2);
  TestValidator.equals(
    "memberId stable",
    profileA2.memberId,
    profileA1.memberId,
  );
  TestValidator.equals("id stable", profileA2.id, profileA1.id);
  TestValidator.equals(
    "displayName stable",
    profileA2.displayName,
    profileA1.displayName,
  );
  TestValidator.equals(
    "createdAt stable",
    profileA2.createdAt,
    profileA1.createdAt,
  );
  TestValidator.equals(
    "updatedAt stable",
    profileA2.updatedAt,
    profileA1.updatedAt,
  );
  TestValidator.equals(
    "deletedAt stable",
    profileA2.deletedAt,
    profileA1.deletedAt,
  );
  // 4) Member B join + privacy boundary
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberBAuthorized);
  const profileB =
    await api.functional.multiUserTodo.member.account.at(memberBConnection);
  typia.assert(profileB);
  TestValidator.equals(
    "memberId matches B",
    profileB.memberId,
    memberBAuthorized.id,
  );
  TestValidator.notEquals(
    "member profiles isolated by memberId",
    profileB.memberId,
    profileA1.memberId,
  );
  // 5) After session invalidation (missing Authorization header)
  const invalidConnection: api.IConnection = { host: connection.host };
  invalidConnection.headers = {};
  await TestValidator.error(
    "deny access without valid member session",
    async () => {
      await api.functional.multiUserTodo.member.account.at(invalidConnection);
    },
  );
}
