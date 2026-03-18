import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_multi_user_todo_user_profile_snapshot } from "../prepare/prepare_random_multi_user_todo_user_profile_snapshot";

export async function generate_random_multi_user_todo_member_profile_snapshots_create_profile_snapshot(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMultiUserTodoUserProfileSnapshot.ICreate> | undefined;
  },
): Promise<IMultiUserTodoUserProfileSnapshot> {
  const prepared: IMultiUserTodoUserProfileSnapshot.ICreate =
    prepare_random_multi_user_todo_user_profile_snapshot(props.body);
  return await api.functional.multiUserTodo.member.profileSnapshots.createProfileSnapshot(
    connection,
    {
      body: prepared,
    },
  );
}
