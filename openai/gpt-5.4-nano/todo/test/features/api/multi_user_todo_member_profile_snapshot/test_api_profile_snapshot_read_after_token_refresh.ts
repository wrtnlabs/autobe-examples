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

export async function test_api_profile_snapshot_read_after_token_refresh(
  connection: api.IConnection,
): Promise<void> {
  // 1) First member joins
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstAuth = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(firstAuth);
  // Create snapshot as first member
  const firstSnapshotInput: IMultiUserTodoUserProfileSnapshot.ICreate = {
    display_name: RandomGenerator.name(),
  };
  const createdByFirst =
    await generate_random_multi_user_todo_member_profile_snapshots_create_profile_snapshot(
      firstMemberConnection,
      {
        body: firstSnapshotInput,
      },
    );
  typia.assert(createdByFirst);
  // 3) Refresh first member session
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  await authorize_member_refresh(firstRefreshConnection, {
    body: {
      refreshToken: firstAuth.token.refresh,
    } satisfies IMultiUserTodoMember.IRefresh,
  });
  // 4) Read snapshot after refresh
  const refreshedRead =
    await api.functional.multiUserTodo.member.profileSnapshots.at(
      firstRefreshConnection,
      {
        snapshotId: createdByFirst.id,
      },
    );
  typia.assert(refreshedRead);
  // 5) Validate fields match
  TestValidator.equals(
    "snapshot id matches",
    refreshedRead.id,
    createdByFirst.id,
  );
  TestValidator.equals(
    "snapshot owner matches",
    refreshedRead.multi_user_todo_member_id,
    createdByFirst.multi_user_todo_member_id,
  );
  TestValidator.equals(
    "snapshot display name matches",
    refreshedRead.display_name,
    createdByFirst.display_name,
  );
  TestValidator.equals(
    "snapshot created_at matches",
    refreshedRead.created_at,
    createdByFirst.created_at,
  );
  TestValidator.equals(
    "snapshot updated_at matches",
    refreshedRead.updated_at,
    createdByFirst.updated_at,
  );
  TestValidator.equals(
    "snapshot deleted_at matches",
    refreshedRead.deleted_at,
    createdByFirst.deleted_at,
  );
  // 6) Privacy boundary: second member cannot read first member's snapshot
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  await TestValidator.error(
    "second member cannot read first member snapshot after first member refresh",
    async () => {
      await api.functional.multiUserTodo.member.profileSnapshots.at(
        secondMemberConnection,
        {
          snapshotId: createdByFirst.id,
        },
      );
    },
  );
}
