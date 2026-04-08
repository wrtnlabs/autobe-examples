import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test rejecting an update when display_name becomes empty after trimming.
 *
 * Validates that the member profile update endpoint trims the incoming display_name
 * and rejects whitespace-only inputs (which become an empty string). It also
 * confirms that a rejected update does not overwrite the persisted display_name.
 *
 * 1. Member joins to obtain an authenticated context.
 * 2. Member reads baseline profile and records current display_name.
 * 3. Member attempts to update profile with whitespace-only display_name.
 * 4. The update must be rejected (error response).
 * 5. Member reads profile again.
 * 6. The display_name must equal the original baseline value.
 */
export async function test_api_user_profile_display_name_update_rejected_when_trim_results_empty_without_overwrite(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  // 2) Baseline profile read
  const baselineProfile =
    await api.functional.multiUserTodo.member.profile.at(memberConnection);
  typia.assert(baselineProfile);
  const baselineDisplayName: string = baselineProfile.display_name;
  // 3) Attempt whitespace-only update
  const rejectedBody: IMultiUserTodoUserProfile.IUpdate = {
    display_name: "\t  \n  ",
  };
  await TestValidator.error(
    "profile update rejected when trimmed display_name is empty",
    async () => {
      await api.functional.multiUserTodo.member.profiles.updateProfile(
        memberConnection,
        {
          body: rejectedBody,
        },
      );
    },
  );
  // 5) Read profile again
  const afterProfile =
    await api.functional.multiUserTodo.member.profile.at(memberConnection);
  typia.assert(afterProfile);
  // 6) Ensure no overwrite
  TestValidator.equals(
    "display_name remains unchanged after rejected whitespace-only update",
    afterProfile.display_name,
    baselineDisplayName,
  );
}
