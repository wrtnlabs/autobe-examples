import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoUserProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_profile_snapshots_create_profile_snapshot } from "../../../generate/generate_random_multi_user_todo_member_profile_snapshots_create_profile_snapshot";
import { prepare_random_multi_user_todo_user_profile_snapshot } from "../../../prepare/prepare_random_multi_user_todo_user_profile_snapshot";

export async function test_api_profile_snapshots_create_success_and_privacy_boundary(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated members A and B
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAAuth);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberBAuth);
  // Member A creates first snapshot
  const displayName1 = RandomGenerator.name();
  const snapshot1 =
    await generate_random_multi_user_todo_member_profile_snapshots_create_profile_snapshot(
      memberAConnection,
      {
        body: {
          display_name: displayName1,
        } satisfies IMultiUserTodoUserProfileSnapshot.ICreate,
      },
    );
  typia.assert(snapshot1);
  TestValidator.equals(
    "snapshot1 display_name",
    snapshot1.display_name,
    displayName1,
  );
  TestValidator.equals(
    "snapshot1 owner is member A",
    snapshot1.multi_user_todo_member_id,
    memberAAuth.id,
  );
  TestValidator.equals(
    "snapshot1 deleted_at is null",
    snapshot1.deleted_at,
    null,
  );
  // Member A creates second snapshot with different name
  const displayName2 = RandomGenerator.name();
  const snapshot2 =
    await generate_random_multi_user_todo_member_profile_snapshots_create_profile_snapshot(
      memberAConnection,
      {
        body: {
          display_name: displayName2,
        } satisfies IMultiUserTodoUserProfileSnapshot.ICreate,
      },
    );
  typia.assert(snapshot2);
  TestValidator.notEquals(
    "snapshot2 has different id",
    snapshot1.id,
    snapshot2.id,
  );
  TestValidator.equals(
    "snapshot2 display_name",
    snapshot2.display_name,
    displayName2,
  );
  TestValidator.equals(
    "snapshot2 owner is member A",
    snapshot2.multi_user_todo_member_id,
    memberAAuth.id,
  );
  TestValidator.equals(
    "snapshot1 display_name preserved",
    snapshot1.display_name,
    displayName1,
  );
  // Privacy boundary: Member B snapshots using a display_name known from member A
  const snapshotForB =
    await generate_random_multi_user_todo_member_profile_snapshots_create_profile_snapshot(
      memberBConnection,
      {
        body: {
          display_name: displayName1,
        } satisfies IMultiUserTodoUserProfileSnapshot.ICreate,
      },
    );
  typia.assert(snapshotForB);
  TestValidator.equals(
    "snapshotForB display_name",
    snapshotForB.display_name,
    displayName1,
  );
  TestValidator.equals(
    "snapshotForB owner is member B",
    snapshotForB.multi_user_todo_member_id,
    memberBAuth.id,
  );
  TestValidator.notEquals(
    "snapshotForB must not expose member A id as owner",
    snapshotForB.multi_user_todo_member_id,
    memberAAuth.id,
  );
  TestValidator.equals(
    "snapshotForB deleted_at is null",
    snapshotForB.deleted_at,
    null,
  );
  // Edge: invalid/expired session should not create snapshot
  const invalidConnection: api.IConnection = { host: connection.host };
  const displayName3 = RandomGenerator.name();
  await TestValidator.error(
    "unauthenticated member cannot create profile snapshot",
    async () => {
      await generate_random_multi_user_todo_member_profile_snapshots_create_profile_snapshot(
        invalidConnection,
        {
          body: {
            display_name: displayName3,
          } satisfies IMultiUserTodoUserProfileSnapshot.ICreate,
        },
      );
    },
  );
}
