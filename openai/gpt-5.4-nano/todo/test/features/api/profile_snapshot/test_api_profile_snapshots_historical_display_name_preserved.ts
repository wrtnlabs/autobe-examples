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

export async function test_api_profile_snapshots_historical_display_name_preserved(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as an acting member
  const memberConnection: api.IConnection = { host: connection.host };
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: boolean = RandomGenerator.pick([true, false]);
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(authorized);
  const nameBefore = RandomGenerator.name();
  const nameAfter = RandomGenerator.name();
  // Ensure distinct display names
  const displayName1 = nameBefore;
  const displayName2 =
    nameAfter !== nameBefore ? nameAfter : `${RandomGenerator.name()}_v2`;
  // 2) Create first snapshot
  const snapshot1 =
    await generate_random_multi_user_todo_member_profile_snapshots_create_profile_snapshot(
      memberConnection,
      {
        body: { display_name: displayName1 },
      },
    );
  typia.assert(snapshot1);
  // 3) Create second snapshot
  const snapshot2 =
    await generate_random_multi_user_todo_member_profile_snapshots_create_profile_snapshot(
      memberConnection,
      {
        body: { display_name: displayName2 },
      },
    );
  typia.assert(snapshot2);
  // Validate historical preservation at creation time
  TestValidator.equals(
    "snapshot1 display_name preserves name_before",
    snapshot1.display_name,
    displayName1,
  );
  TestValidator.equals(
    "snapshot2 display_name preserves name_after",
    snapshot2.display_name,
    displayName2,
  );
  TestValidator.notEquals(
    "snapshot ids differ between two created snapshots",
    snapshot1.id,
    snapshot2.id,
  );
}
