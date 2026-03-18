import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_multi_user_todo_user_profile } from "../prepare/prepare_random_multi_user_todo_user_profile";

export async function generate_random_multi_user_todo_member_profiles_create_profile(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMultiUserTodoUserProfile.ICreate> | undefined;
  },
): Promise<IMultiUserTodoUserProfile> {
  const prepared: IMultiUserTodoUserProfile.ICreate =
    prepare_random_multi_user_todo_user_profile(props.body);
  return await api.functional.multiUserTodo.member.profiles.createProfile(
    connection,
    {
      body: prepared,
    },
  );
}
