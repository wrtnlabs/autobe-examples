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

export async function test_api_profile_update_privacy_boundary_own_profile_only(
  connection: api.IConnection,
): Promise<void> {
  const displayNameA: string = `A-${RandomGenerator.alphabets(10)}`;
  const displayNameB: string = `B-${RandomGenerator.alphabets(10)}`;
  // Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const authorizedA: IMultiUserTodoMember.IAuthorized =
    await authorize_member_join(memberAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.pick([true, false]),
      } satisfies IMultiUserTodoMember.IJoin,
    });
  typia.assert(authorizedA);
  // Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const authorizedB: IMultiUserTodoMember.IAuthorized =
    await authorize_member_join(memberBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.pick([true, false]),
      } satisfies IMultiUserTodoMember.IJoin,
    });
  typia.assert(authorizedB);
  // Update A profile
  const updatedA: IMultiUserTodoUserProfile =
    await api.functional.multiUserTodo.member.profile.update(
      memberAConnection,
      {
        body: {
          displayName: displayNameA,
        } satisfies IMultiUserTodoUserProfile.IUpdate,
      },
    );
  typia.assert(updatedA);
  TestValidator.equals(
    "memberId matches acting member A",
    updatedA.memberId,
    authorizedA.id,
  );
  TestValidator.equals(
    "displayName A updated",
    updatedA.displayName,
    displayNameA,
  );
  // Update B profile
  const updatedB: IMultiUserTodoUserProfile =
    await api.functional.multiUserTodo.member.profile.update(
      memberBConnection,
      {
        body: {
          displayName: displayNameB,
        } satisfies IMultiUserTodoUserProfile.IUpdate,
      },
    );
  typia.assert(updatedB);
  TestValidator.equals(
    "memberId matches acting member B",
    updatedB.memberId,
    authorizedB.id,
  );
  TestValidator.equals(
    "displayName B updated",
    updatedB.displayName,
    displayNameB,
  );
  // Re-update A and ensure cross-user overwrite does not occur
  const updatedA2: IMultiUserTodoUserProfile =
    await api.functional.multiUserTodo.member.profile.update(
      memberAConnection,
      {
        body: {
          displayName: displayNameA + "-2",
        } satisfies IMultiUserTodoUserProfile.IUpdate,
      },
    );
  typia.assert(updatedA2);
  TestValidator.equals(
    "memberId remains A for second update",
    updatedA2.memberId,
    authorizedA.id,
  );
  TestValidator.equals(
    "displayName A second update",
    updatedA2.displayName,
    displayNameA + "-2",
  );
  // Re-update B and ensure cross-user overwrite does not occur
  const updatedB2: IMultiUserTodoUserProfile =
    await api.functional.multiUserTodo.member.profile.update(
      memberBConnection,
      {
        body: {
          displayName: displayNameB + "-2",
        } satisfies IMultiUserTodoUserProfile.IUpdate,
      },
    );
  typia.assert(updatedB2);
  TestValidator.equals(
    "memberId remains B for second update",
    updatedB2.memberId,
    authorizedB.id,
  );
  TestValidator.equals(
    "displayName B second update",
    updatedB2.displayName,
    displayNameB + "-2",
  );
}
