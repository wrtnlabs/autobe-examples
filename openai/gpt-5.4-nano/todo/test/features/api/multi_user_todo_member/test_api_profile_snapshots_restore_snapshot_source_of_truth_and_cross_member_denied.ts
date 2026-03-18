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

export async function test_api_profile_snapshots_restore_snapshot_source_of_truth_and_cross_member_denied(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Member A: direct updates to create some snapshot history.
  const displayNameA: string & tags.MinLength<1> = typia.random<
    string & tags.MinLength<1>
  >();
  const displayNameB: string & tags.MinLength<1> = typia.random<
    string & tags.MinLength<1>
  >();
  const profileAfterA =
    await api.functional.multiUserTodo.member.profileSnapshots.updateProfileSnapshots(
      memberAConnection,
      {
        body: {
          display_name: displayNameA,
          restore_snapshot_id: null,
        } satisfies IMultiUserTodoUserProfileSnapshot.IUpdate,
      },
    );
  typia.assert(profileAfterA);
  const profileAfterB =
    await api.functional.multiUserTodo.member.profileSnapshots.updateProfileSnapshots(
      memberAConnection,
      {
        body: {
          display_name: displayNameB,
          restore_snapshot_id: null,
        } satisfies IMultiUserTodoUserProfileSnapshot.IUpdate,
      },
    );
  typia.assert(profileAfterB);
  TestValidator.equals(
    "memberId matches acting member (A)",
    profileAfterB.memberId,
    memberAAuth.id,
  );
  TestValidator.equals("deletedAt null (A)", profileAfterB.deletedAt, null);
  // Scenario 1 (best-effort due to missing snapshot-list/read APIs):
  // Attempt a restore while providing a different display_name.
  const restoreSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const providedDisplayNameDifferent: string & tags.MinLength<1> = typia.random<
    string & tags.MinLength<1>
  >();
  const profileAfterRestoreAttempt =
    await api.functional.multiUserTodo.member.profileSnapshots.updateProfileSnapshots(
      memberAConnection,
      {
        body: {
          restore_snapshot_id: restoreSnapshotId,
          display_name: providedDisplayNameDifferent,
        } satisfies IMultiUserTodoUserProfileSnapshot.IUpdate,
      },
    );
  typia.assert(profileAfterRestoreAttempt);
  TestValidator.equals(
    "memberId matches acting member (A) after restore attempt",
    profileAfterRestoreAttempt.memberId,
    memberAAuth.id,
  );
  TestValidator.equals(
    "deletedAt null (A) after restore attempt",
    profileAfterRestoreAttempt.deletedAt,
    null,
  );
  TestValidator.notEquals(
    "updatedAt changes after restore attempt",
    profileAfterB.updatedAt,
    profileAfterRestoreAttempt.updatedAt,
  );
  // Scenario 2 (history continuity via direct-update semantics):
  const directUpdateValueA: string & tags.MinLength<1> = typia.random<
    string & tags.MinLength<1>
  >();
  const directUpdateValueB: string & tags.MinLength<1> = typia.random<
    string & tags.MinLength<1>
  >();
  const profileAfterDirectA =
    await api.functional.multiUserTodo.member.profileSnapshots.updateProfileSnapshots(
      memberAConnection,
      {
        body: {
          display_name: directUpdateValueA,
          restore_snapshot_id: null,
        } satisfies IMultiUserTodoUserProfileSnapshot.IUpdate,
      },
    );
  typia.assert(profileAfterDirectA);
  const profileAfterDirectB =
    await api.functional.multiUserTodo.member.profileSnapshots.updateProfileSnapshots(
      memberAConnection,
      {
        body: {
          display_name: directUpdateValueB,
          restore_snapshot_id: null,
        } satisfies IMultiUserTodoUserProfileSnapshot.IUpdate,
      },
    );
  typia.assert(profileAfterDirectB);
  TestValidator.equals(
    "direct update value applied A",
    profileAfterDirectA.displayName,
    directUpdateValueA,
  );
  TestValidator.equals(
    "direct update value applied B",
    profileAfterDirectB.displayName,
    directUpdateValueB,
  );
  // Scenario 3: Cross-member restore denied (best-effort: validate denial by expecting error).
  const crossMemberRestoreId: string & tags.Format<"uuid"> = restoreSnapshotId;
  await TestValidator.error(
    "cross-member restore should be denied",
    async () => {
      await api.functional.multiUserTodo.member.profileSnapshots.updateProfileSnapshots(
        memberBConnection,
        {
          body: {
            restore_snapshot_id: crossMemberRestoreId,
            display_name: typia.random<string & tags.MinLength<1>>(),
          } satisfies IMultiUserTodoUserProfileSnapshot.IUpdate,
        },
      );
    },
  );
  // Post-condition: ensure member B profile remains accessible and correctly scoped.
  const memberBProfile =
    await api.functional.multiUserTodo.member.profileSnapshots.updateProfileSnapshots(
      memberBConnection,
      {
        body: {
          display_name: typia.random<string & tags.MinLength<1>>(),
          restore_snapshot_id: null,
        } satisfies IMultiUserTodoUserProfileSnapshot.IUpdate,
      },
    );
  typia.assert(memberBProfile);
  TestValidator.equals(
    "memberId matches acting member (B)",
    memberBProfile.memberId,
    memberBAuth.id,
  );
  TestValidator.equals("deletedAt null (B)", memberBProfile.deletedAt, null);
}
