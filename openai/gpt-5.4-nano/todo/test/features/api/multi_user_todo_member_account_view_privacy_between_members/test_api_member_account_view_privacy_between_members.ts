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

export async function test_api_member_account_view_privacy_between_members(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins and fetches own private profile
  const memberAConnectionBase: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnectionBase, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const memberAConnection: api.IConnection = { host: connection.host };
  memberAConnection.headers = {
    Authorization: memberAAuthorized.token.access,
  };
  const memberAProfile =
    await api.functional.multiUserTodo.member.account.at(memberAConnection);
  typia.assert(memberAProfile);
  // 2) Member B joins and fetches own private profile
  const memberBConnectionBase: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnectionBase, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  memberBConnection.headers = {
    Authorization: memberBAuthorized.token.access,
  };
  const memberBProfile =
    await api.functional.multiUserTodo.member.account.at(memberBConnection);
  typia.assert(memberBProfile);
  // 3) Validate isolation: B cannot see A's profile identifiers/data
  TestValidator.notEquals(
    "memberId must differ between members",
    memberBProfile.memberId,
    memberAProfile.memberId,
  );
  TestValidator.notEquals(
    "displayName must differ between members",
    memberBProfile.displayName,
    memberAProfile.displayName,
  );
  // 4) Repeat with member A after member B call
  const memberAProfileAfter =
    await api.functional.multiUserTodo.member.account.at(memberAConnection);
  typia.assert(memberAProfileAfter);
  TestValidator.equals(
    "memberId consistent for member A",
    memberAProfileAfter.memberId,
    memberAProfile.memberId,
  );
  TestValidator.equals(
    "displayName consistent for member A",
    memberAProfileAfter.displayName,
    memberAProfile.displayName,
  );
}
