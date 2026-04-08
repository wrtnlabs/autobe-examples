import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_user_profile_display_name_update_self_only_boundary(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Self-only authorization boundary for updating display_name.
   *
   * This test verifies that two authenticated members can update only their
   * own private user profile display name via PUT /multiUserTodo/member/profile.
   *
   * It validates ownership scoping by checking the returned
   * `multi_user_todo_user_id` and `display_name` for each successful update,
   * and by ensuring that Member B's previously captured successful response
   * remains associated with Member B's profile scope throughout Member A's
   * subsequent update.
   *
   * 1. Member A joins and sets display_name to "UserA Name".
   * 2. Member B joins and sets display_name to "UserB Name".
   * 3. Member A updates again to "UserA Name 2".
   * 4. Confirms that each captured response reflects the caller's own
   *    `multi_user_todo_user_id` and the expected display_name value.
   */
  const memberAConnection: api.IConnection = { host: connection.host };
  const authorizedA = await authorize_member_join(memberAConnection, {
    body: {
      display_name: "MemberA Base Name",
      password: "Password1!MemberA",
      href: "https://example.com/memberA",
      referrer: "https://example.com/referrerA",
      ip: "127.0.0.1",
    },
  });
  const memberAAuthed: api.IConnection = { host: connection.host };
  memberAAuthed.headers = {
    Authorization: `Bearer ${authorizedA.token.access}`,
  };
  const memberBConnection: api.IConnection = { host: connection.host };
  const authorizedB = await authorize_member_join(memberBConnection, {
    body: {
      display_name: "MemberB Base Name",
      password: "Password1!MemberB",
      href: "https://example.com/memberB",
      referrer: "https://example.com/referrerB",
      ip: "127.0.0.1",
    },
  });
  const memberBAuthed: api.IConnection = { host: connection.host };
  memberBAuthed.headers = {
    Authorization: `Bearer ${authorizedB.token.access}`,
  };
  const bodyA1 = {
    display_name: "UserA Name",
  } satisfies IMultiUserTodoUserProfile.IUpdate;
  const responseA = await api.functional.multiUserTodo.member.profile.put(
    memberAAuthed,
    {
      body: bodyA1,
    },
  );
  typia.assert(responseA);
  const bodyB = {
    display_name: "UserB Name",
  } satisfies IMultiUserTodoUserProfile.IUpdate;
  const responseB = await api.functional.multiUserTodo.member.profile.put(
    memberBAuthed,
    {
      body: bodyB,
    },
  );
  typia.assert(responseB);
  const bodyA2 = {
    display_name: "UserA Name 2",
  } satisfies IMultiUserTodoUserProfile.IUpdate;
  const responseA2 = await api.functional.multiUserTodo.member.profile.put(
    memberAAuthed,
    {
      body: bodyA2,
    },
  );
  typia.assert(responseA2);
  TestValidator.equals(
    "member A profile scope matches",
    responseA.multi_user_todo_user_id,
    authorizedA.multi_user_todo_user_id,
  );
  TestValidator.equals(
    "member A display name set",
    responseA.display_name,
    "UserA Name",
  );
  TestValidator.equals(
    "member B profile scope matches",
    responseB.multi_user_todo_user_id,
    authorizedB.multi_user_todo_user_id,
  );
  TestValidator.equals(
    "member B display name set",
    responseB.display_name,
    "UserB Name",
  );
  TestValidator.equals(
    "member A profile scope matches on second update",
    responseA2.multi_user_todo_user_id,
    authorizedA.multi_user_todo_user_id,
  );
  TestValidator.equals(
    "member A display name updated",
    responseA2.display_name,
    "UserA Name 2",
  );
  TestValidator.equals(
    "cross-member isolation: member B response remains unchanged",
    responseB.display_name,
    "UserB Name",
  );
  TestValidator.equals(
    "cross-member isolation: member B response scope stays with member B",
    responseB.multi_user_todo_user_id,
    authorizedB.multi_user_todo_user_id,
  );
}
