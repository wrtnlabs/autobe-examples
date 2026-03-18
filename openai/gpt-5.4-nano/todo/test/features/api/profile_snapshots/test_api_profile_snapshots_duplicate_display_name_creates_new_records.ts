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

export async function test_api_profile_snapshots_duplicate_display_name_creates_new_records(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.pick([true, false]);
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(joined);
  const displayName = RandomGenerator.name();
  const body = {
    display_name: displayName,
  } satisfies IMultiUserTodoUserProfileSnapshot.ICreate;
  const snapshot1 =
    await generate_random_multi_user_todo_member_profile_snapshots_create_profile_snapshot(
      memberConnection,
      {
        body,
      },
    );
  typia.assert(snapshot1);
  const snapshot2 =
    await generate_random_multi_user_todo_member_profile_snapshots_create_profile_snapshot(
      memberConnection,
      {
        body,
      },
    );
  typia.assert(snapshot2);
  TestValidator.notEquals("snapshot ids differ", snapshot1.id, snapshot2.id);
  TestValidator.equals(
    "display_name matches",
    snapshot1.display_name,
    displayName,
  );
  TestValidator.equals(
    "display_name matches (2)",
    snapshot2.display_name,
    displayName,
  );
  TestValidator.equals("deleted_at is null (1)", snapshot1.deleted_at, null);
  TestValidator.equals("deleted_at is null (2)", snapshot2.deleted_at, null);
  TestValidator.equals(
    "ownership member id matches (1)",
    snapshot1.multi_user_todo_member_id,
    joined.id,
  );
  TestValidator.equals(
    "ownership member id matches (2)",
    snapshot2.multi_user_todo_member_id,
    joined.id,
  );
}
