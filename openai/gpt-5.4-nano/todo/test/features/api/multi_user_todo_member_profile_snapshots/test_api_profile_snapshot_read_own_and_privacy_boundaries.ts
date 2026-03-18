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

export async function test_api_profile_snapshot_read_own_and_privacy_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Member A reads own snapshots
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberA);
  const snapshotDisplayNameA1 = RandomGenerator.name();
  const snapshot1 =
    await generate_random_multi_user_todo_member_profile_snapshots_create_profile_snapshot(
      memberAConnection,
      {
        body: {
          display_name: snapshotDisplayNameA1,
        } satisfies IMultiUserTodoUserProfileSnapshot.ICreate,
      },
    );
  typia.assert(snapshot1);
  const snapshotDisplayNameA2 = RandomGenerator.name();
  const snapshot2 =
    await generate_random_multi_user_todo_member_profile_snapshots_create_profile_snapshot(
      memberAConnection,
      {
        body: {
          display_name: snapshotDisplayNameA2,
        } satisfies IMultiUserTodoUserProfileSnapshot.ICreate,
      },
    );
  typia.assert(snapshot2);
  const readSnapshot1 =
    await api.functional.multiUserTodo.member.profileSnapshots.at(
      memberAConnection,
      {
        snapshotId: snapshot1.id,
      },
    );
  typia.assert(readSnapshot1);
  TestValidator.equals(
    "member A snapshot1 id matches",
    readSnapshot1.id,
    snapshot1.id,
  );
  TestValidator.equals(
    "member A snapshot1 display_name matches",
    readSnapshot1.display_name,
    snapshotDisplayNameA1,
  );
  const readSnapshot2 =
    await api.functional.multiUserTodo.member.profileSnapshots.at(
      memberAConnection,
      {
        snapshotId: snapshot2.id,
      },
    );
  typia.assert(readSnapshot2);
  TestValidator.equals(
    "member A snapshot2 id matches",
    readSnapshot2.id,
    snapshot2.id,
  );
  TestValidator.equals(
    "member A snapshot2 display_name matches",
    readSnapshot2.display_name,
    snapshotDisplayNameA2,
  );
  // Scenario 2: Member B cannot read Member A snapshot
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberB);
  await TestValidator.error(
    "member B cannot read member A snapshot",
    async () => {
      await api.functional.multiUserTodo.member.profileSnapshots.at(
        memberBConnection,
        {
          snapshotId: snapshot1.id,
        },
      );
    },
  );
}
