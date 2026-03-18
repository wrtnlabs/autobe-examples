import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_profiles_create_profile } from "../../../generate/generate_random_multi_user_todo_member_profiles_create_profile";
import { prepare_random_multi_user_todo_user_profile } from "../../../prepare/prepare_random_multi_user_todo_user_profile";

export async function test_api_user_profile_create_cross_user_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAAuthorized);
  // 2) Authenticate member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberBAuthorized);
  // Ensure different members
  TestValidator.notEquals(
    "member A id differs from member B id",
    memberAAuthorized.id,
    memberBAuthorized.id,
  );
  // 3) Create profile as member A
  const memberADisplayName = `member-a-${RandomGenerator.alphabets(8)}`;
  const memberAProfile =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberAConnection,
      {
        body: {
          display_name: memberADisplayName,
        } satisfies IMultiUserTodoUserProfile.ICreate,
      },
    );
  typia.assert(memberAProfile);
  TestValidator.equals(
    "member A profile memberId matches member A",
    memberAProfile.memberId,
    memberAAuthorized.id,
  );
  TestValidator.equals(
    "member A profile displayName matches input",
    memberAProfile.displayName,
    memberADisplayName,
  );
  // 4) Create profile as member B with different display name
  const memberBDisplayName = `member-b-${RandomGenerator.alphabets(8)}`;
  const memberBProfile =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberBConnection,
      {
        body: {
          display_name: memberBDisplayName,
        } satisfies IMultiUserTodoUserProfile.ICreate,
      },
    );
  typia.assert(memberBProfile);
  // 5) Validate isolation
  TestValidator.equals(
    "member B profile memberId matches member B",
    memberBProfile.memberId,
    memberBAuthorized.id,
  );
  TestValidator.notEquals(
    "member B profile does not belong to member A",
    memberBProfile.memberId,
    memberAProfile.memberId,
  );
  // Member A is privacy-isolated from member B; member B should not receive A's displayName.
  TestValidator.notEquals(
    "member B profile displayName does not leak member A displayName",
    memberBProfile.displayName,
    memberAProfile.displayName,
  );
  // Verify member A profile remains unchanged (no overwrite by member B)
  const memberAProfileSecond =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberAConnection,
      {
        body: {
          display_name: memberADisplayName,
        } satisfies IMultiUserTodoUserProfile.ICreate,
      },
    );
  typia.assert(memberAProfileSecond);
  TestValidator.equals(
    "member A profile memberId still matches member A",
    memberAProfileSecond.memberId,
    memberAAuthorized.id,
  );
  TestValidator.equals(
    "member A profile displayName not overwritten by member B",
    memberAProfileSecond.displayName,
    memberADisplayName,
  );
}
