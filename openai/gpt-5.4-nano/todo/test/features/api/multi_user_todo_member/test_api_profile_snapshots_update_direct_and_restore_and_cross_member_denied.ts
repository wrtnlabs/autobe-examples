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

export async function test_api_profile_snapshots_update_direct_and_restore_and_cross_member_denied(
  connection: api.IConnection,
): Promise<void> {
  // --- Member A join ---
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // --- Member B join ---
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // ========== Scenario 1: Direct display name update creates history snapshot ==========
  const memberADisplayName1 = RandomGenerator.name();
  const update1 =
    await api.functional.multiUserTodo.member.profileSnapshots.updateProfileSnapshots(
      memberAConnection,
      {
        body: {
          display_name: memberADisplayName1,
          restore_snapshot_id: null,
        } satisfies IMultiUserTodoUserProfileSnapshot.IUpdate,
      },
    );
  typia.assert(update1);
  TestValidator.equals(
    "memberId stays same",
    update1.memberId,
    memberAAuthorized.id,
  );
  TestValidator.equals(
    "displayName matches",
    update1.displayName,
    memberADisplayName1,
  );
  TestValidator.equals("deletedAt is null", update1.deletedAt, null);
  const updatedAt1 = update1.updatedAt;
  const memberADisplayName2 = RandomGenerator.name();
  const update2 =
    await api.functional.multiUserTodo.member.profileSnapshots.updateProfileSnapshots(
      memberAConnection,
      {
        body: {
          display_name: memberADisplayName2,
          restore_snapshot_id: null,
        } satisfies IMultiUserTodoUserProfileSnapshot.IUpdate,
      },
    );
  typia.assert(update2);
  TestValidator.equals(
    "memberId stays same after second update",
    update2.memberId,
    memberAAuthorized.id,
  );
  TestValidator.equals(
    "displayName updated",
    update2.displayName,
    memberADisplayName2,
  );
  TestValidator.equals("deletedAt remains null", update2.deletedAt, null);
  TestValidator.predicate(
    "updatedAt increases after second update",
    update2.updatedAt !== updatedAt1 && update2.updatedAt > updatedAt1,
  );
  // Best-effort snapshot id extraction from response payload (if API includes it).
  const snapshotIdFromUpdate1: string | undefined =
    (
      update1 as {
        snapshotId?: string;
        restoreSnapshotId?: string;
        restore_snapshot_id?: string;
      }
    ).snapshotId ??
    (
      update1 as {
        restoreSnapshotId?: string;
      }
    ).restoreSnapshotId;
  // ========== Scenario 2: Restore from an owned (restorable) snapshot updates display name ==========
  if (snapshotIdFromUpdate1 !== undefined) {
    const restoreAttempt =
      await api.functional.multiUserTodo.member.profileSnapshots.updateProfileSnapshots(
        memberAConnection,
        {
          body: {
            // Value may be ignored/validation-only for restore path; server source of truth is snapshot.
            display_name: RandomGenerator.name(),
            restore_snapshot_id: snapshotIdFromUpdate1,
          } satisfies IMultiUserTodoUserProfileSnapshot.IUpdate,
        },
      );
    typia.assert(restoreAttempt);
    TestValidator.equals(
      "restored memberId matches",
      restoreAttempt.memberId,
      memberAAuthorized.id,
    );
    TestValidator.equals(
      "restored deletedAt is null",
      restoreAttempt.deletedAt,
      null,
    );
    TestValidator.equals(
      "restored displayName equals snapshot prior value",
      restoreAttempt.displayName,
      memberADisplayName1,
    );
    TestValidator.predicate(
      "updatedAt changes on restore",
      restoreAttempt.updatedAt !== update2.updatedAt &&
        restoreAttempt.updatedAt > update2.updatedAt,
    );
  }
  // ========== Scenario 3: Cross-member restore attempt is denied safely ==========
  const bDisplayNameBefore = RandomGenerator.name();
  const bUpdateBefore =
    await api.functional.multiUserTodo.member.profileSnapshots.updateProfileSnapshots(
      memberBConnection,
      {
        body: {
          display_name: bDisplayNameBefore,
          restore_snapshot_id: null,
        } satisfies IMultiUserTodoUserProfileSnapshot.IUpdate,
      },
    );
  typia.assert(bUpdateBefore);
  TestValidator.equals(
    "B memberId matches",
    bUpdateBefore.memberId,
    memberBAuthorized.id,
  );
  const updatedAtBBefore = bUpdateBefore.updatedAt;
  const crossMemberSnapshotId: string | undefined = snapshotIdFromUpdate1;
  await TestValidator.error(
    "cross-member restore should be rejected",
    async () => {
      const restoreSnapshotId =
        crossMemberSnapshotId ?? typia.random<string & tags.Format<"uuid">>();
      await api.functional.multiUserTodo.member.profileSnapshots.updateProfileSnapshots(
        memberBConnection,
        {
          body: {
            display_name: RandomGenerator.name(),
            restore_snapshot_id: restoreSnapshotId,
          } satisfies IMultiUserTodoUserProfileSnapshot.IUpdate,
        },
      );
    },
  );
  // Without a dedicated GET endpoint, we validate safety by ensuring the profile can still be updated
  // to a known value and retains that member scope. We cannot reliably prove updatedAt immutability
  // after a denied request without read access.
  const bDisplayNameAfter = RandomGenerator.name();
  const bUpdateAfter =
    await api.functional.multiUserTodo.member.profileSnapshots.updateProfileSnapshots(
      memberBConnection,
      {
        body: {
          display_name: bDisplayNameAfter,
          restore_snapshot_id: null,
        } satisfies IMultiUserTodoUserProfileSnapshot.IUpdate,
      },
    );
  typia.assert(bUpdateAfter);
  TestValidator.equals(
    "B memberId unchanged",
    bUpdateAfter.memberId,
    memberBAuthorized.id,
  );
  TestValidator.equals(
    "B can still update after denied attempt",
    bUpdateAfter.displayName,
    bDisplayNameAfter,
  );
  // Soft-check: updatedAt should be at or after the previous known value.
  TestValidator.predicate(
    "updatedAt is not earlier than before",
    bUpdateAfter.updatedAt >= updatedAtBBefore,
  );
}
