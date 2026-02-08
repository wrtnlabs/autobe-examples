import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_settings_refresh_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This test attempts to invoke the system settings refresh endpoint without
  // authentication as an administrator. It verifies that access is denied,
  // ensuring security controls prevent unauthorized system refresh calls.
  // Use base connection (no login)
  await TestValidator.httpError(
    "refresh settings unauthorized access",
    401,
    async () => {
      await api.functional.discussionBoard.system_settings.refresh.refreshSettings(
        connection,
      );
    },
  );
}
