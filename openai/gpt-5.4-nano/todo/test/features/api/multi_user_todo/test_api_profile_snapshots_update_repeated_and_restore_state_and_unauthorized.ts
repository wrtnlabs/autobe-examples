import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import type { IMultiUserTodoUserProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_snapshots_update_repeated_and_restore_state_and_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a member.
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IMultiUserTodoMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  const memberId = authorized.id;
  // Helper to call update with direct display_name.
  const updateDisplayName = async (displayName: string) => {
    const updated =
      await api.functional.multiUserTodo.member.profileSnapshots.updateProfileSnapshots(
        memberConnection,
        {
          body: {
            display_name: displayName,
            restore_snapshot_id: null,
          } satisfies IMultiUserTodoUserProfileSnapshot.IUpdate,
        },
      );
    typia.assert(updated);
    return updated;
  };
  // Scenario 1: Repeated direct updates.
  const name1 = RandomGenerator.name();
  const profile1 = await updateDisplayName(name1);
  TestValidator.equals("memberId matches", profile1.memberId, memberId);
  TestValidator.equals("deletedAt is null", profile1.deletedAt, null);
  const name2 = RandomGenerator.name();
  const profile2 = await updateDisplayName(name2);
  TestValidator.equals(
    "displayName updated to latest value",
    profile2.displayName,
    name2,
  );
  TestValidator.equals("memberId matches", profile2.memberId, memberId);
  TestValidator.equals("deletedAt is null", profile2.deletedAt, null);
  TestValidator.predicate(
    "updatedAt increases",
    profile2.updatedAt > profile1.updatedAt,
  );
  const name3 = RandomGenerator.name();
  const profile3 = await updateDisplayName(name3);
  TestValidator.equals(
    "displayName updated to latest value",
    profile3.displayName,
    name3,
  );
  TestValidator.equals("memberId matches", profile3.memberId, memberId);
  TestValidator.equals("deletedAt is null", profile3.deletedAt, null);
  TestValidator.predicate(
    "updatedAt increases again",
    profile3.updatedAt > profile2.updatedAt,
  );
  const name4 = RandomGenerator.name();
  const profile4 = await updateDisplayName(name4);
  TestValidator.equals(
    "displayName updated to latest value",
    profile4.displayName,
    name4,
  );
  TestValidator.equals("memberId matches", profile4.memberId, memberId);
  TestValidator.equals("deletedAt is null", profile4.deletedAt, null);
  TestValidator.predicate(
    "updatedAt increases again",
    profile4.updatedAt > profile3.updatedAt,
  );
  // Scenario 3: Unauthorized (no session) update is denied.
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedDisplayName = RandomGenerator.name();
  await TestValidator.httpError(
    "unauthorized update should be denied",
    [401, 403],
    async () => {
      await api.functional.multiUserTodo.member.profileSnapshots.updateProfileSnapshots(
        unauthorizedConnection,
        {
          body: {
            display_name: unauthorizedDisplayName,
            restore_snapshot_id: null,
          } satisfies IMultiUserTodoUserProfileSnapshot.IUpdate,
        },
      );
    },
  );
  // Validate profile is unchanged by checking displayName remains the last authorized value.
  const profileAfterUnauthorized = await updateDisplayName(name4);
  TestValidator.equals(
    "displayName unchanged after unauthorized attempt",
    profileAfterUnauthorized.displayName,
    name4,
  );
  TestValidator.equals(
    "memberId still matches",
    profileAfterUnauthorized.memberId,
    memberId,
  );
  TestValidator.equals(
    "deletedAt is null",
    profileAfterUnauthorized.deletedAt,
    null,
  );
}
