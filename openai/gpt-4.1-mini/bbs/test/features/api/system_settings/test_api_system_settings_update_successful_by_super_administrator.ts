import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_system_settings_update_successful_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare super administrator user and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Construct update payload with at least two system settings
  const updatePayload: IDiscussionBoardSystemSetting.IUpdate[] = [
    {
      key: `key_${RandomGenerator.alphabets(5)}`,
      value: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      deleted_at: null,
    },
    {
      key: `key_${RandomGenerator.alphabets(6)}`,
      value: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 1 }),
      deleted_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
  ];
  // 3. Patch each setting and verify the response
  for (const partialUpdate of updatePayload) {
    const output =
      await api.functional.discussionBoard.superAdministrator.systemSettings.updateSettings(
        superAdminConnection,
        {
          body: partialUpdate,
        },
      );
    typia.assert(output);
    // Check returned updated entity properties reflect input update
    // Confirm id is a UUID format string
    TestValidator.predicate(
      `id is UUID for key ${partialUpdate.key}`,
      /^\b[0-9a-f]{8}\b-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        output.id,
      ),
    );
    TestValidator.equals(
      `key matches for key ${partialUpdate.key}`,
      output.key,
      partialUpdate.key,
    );
    TestValidator.equals(
      `value matches for key ${partialUpdate.key}`,
      output.value,
      partialUpdate.value,
    );
    TestValidator.equals(
      `description matches for key ${partialUpdate.key}`,
      output.description,
      partialUpdate.description,
    );
    TestValidator.equals(
      `deleted_at matches for key ${partialUpdate.key}`,
      output.deleted_at,
      partialUpdate.deleted_at,
    );
  }
}
