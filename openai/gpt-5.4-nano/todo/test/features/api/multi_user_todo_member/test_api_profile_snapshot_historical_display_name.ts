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
import { generate_random_multi_user_todo_member_profile_snapshots_create_profile_snapshot } from "../../../generate/generate_random_multi_user_todo_member_profile_snapshots_create_profile_snapshot";
import { prepare_random_multi_user_todo_user_profile_snapshot } from "../../../prepare/prepare_random_multi_user_todo_user_profile_snapshot";

export async function test_api_profile_snapshot_historical_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a member (utility call updates memberConnection headers)
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(joined);
  // Use only actor-specific connection
  const actorConnection: api.IConnection = memberConnection;
  // 2) Set display name #1
  const displayName1 = RandomGenerator.name(2);
  const updatedProfile1 =
    await api.functional.multiUserTodo.member.profile.update(actorConnection, {
      body: {
        displayName: displayName1,
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    });
  typia.assert(updatedProfile1);
  // 3) Create snapshot #1
  const snapshot1 =
    await generate_random_multi_user_todo_member_profile_snapshots_create_profile_snapshot(
      actorConnection,
      {
        body: { display_name: displayName1 },
      },
    );
  typia.assert(snapshot1);
  const snapshotId1 = snapshot1.id;
  // 4) Set display name #2
  const displayName2 = RandomGenerator.name(2);
  const updatedProfile2 =
    await api.functional.multiUserTodo.member.profile.update(actorConnection, {
      body: {
        displayName: displayName2,
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    });
  typia.assert(updatedProfile2);
  // 5) Create snapshot #2
  const snapshot2 =
    await generate_random_multi_user_todo_member_profile_snapshots_create_profile_snapshot(
      actorConnection,
      {
        body: { display_name: displayName2 },
      },
    );
  typia.assert(snapshot2);
  const snapshotId2 = snapshot2.id;
  // 6) Fetch snapshot #1 and verify historical display_name
  const fetched1 =
    await api.functional.multiUserTodo.member.profileSnapshots.at(
      actorConnection,
      {
        snapshotId: snapshotId1,
      },
    );
  typia.assert(fetched1);
  TestValidator.equals(
    "snapshot #1 captured display_name",
    fetched1.display_name,
    displayName1,
  );
  // 7) Fetch snapshot #2 and verify
  const fetched2 =
    await api.functional.multiUserTodo.member.profileSnapshots.at(
      actorConnection,
      {
        snapshotId: snapshotId2,
      },
    );
  typia.assert(fetched2);
  TestValidator.equals(
    "snapshot #2 captured display_name",
    fetched2.display_name,
    displayName2,
  );
  // 8) Validate timestamp order
  const createdAt1 = new Date(fetched1.created_at).getTime();
  const createdAt2 = new Date(fetched2.created_at).getTime();
  TestValidator.predicate(
    "snapshot #1 created_at precedes snapshot #2 created_at",
    createdAt1 < createdAt2,
  );
}
