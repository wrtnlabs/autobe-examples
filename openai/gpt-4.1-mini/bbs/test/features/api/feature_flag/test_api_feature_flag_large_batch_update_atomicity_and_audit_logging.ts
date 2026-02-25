import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardFeatureFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_feature_flag_large_batch_update_atomicity_and_audit_logging(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdmin);
  // 2. Fetch current feature flags to prepare batch update
  const initialFlags =
    await api.functional.discussionBoard.superAdministrator.featureFlags.index(
      superAdminConnection,
      { body: {} },
    );
  typia.assert(initialFlags);
  // Using the data array of current feature flags
  const flags = initialFlags.data;
  // Define local type matching expected batch update item
  type IBatchUpdateItem = {
    code: string;
    enabled: boolean;
  };
  // 3. Prepare a large batch update request for existing flags - toggle enabled state
  const batchUpdates: IBatchUpdateItem[] = flags.map((flag) => ({
    code: flag.code,
    enabled: !flag.enabled,
  }));
  // 4. Add fake feature flags with non-existent codes to test atomicity and rollback
  const fakeCodes = Array.from(
    { length: 5 },
    () => `nonexistent_code_${RandomGenerator.alphaNumeric(8)}`,
  );
  for (const fakeCode of fakeCodes) {
    batchUpdates.push({
      code: fakeCode,
      enabled: true,
    });
  }
  // 5. Perform batch update expecting to fail atomically due to non-existent codes
  await TestValidator.error(
    "should rollback entire batch update on non-existent codes",
    async () => {
      await api.functional.discussionBoard.superAdministrator.featureFlags.index(
        superAdminConnection,
        {
          body: {
            batchUpdate: batchUpdates,
          } satisfies IDiscussionBoardFeatureFlag.IRequest,
        },
      );
    },
  );
  // 6. Reload flags to verify no partial updates happened
  const flagsAfterFailure =
    await api.functional.discussionBoard.superAdministrator.featureFlags.index(
      superAdminConnection,
      { body: {} },
    );
  typia.assert(flagsAfterFailure);
  // 7. Validate no flag's enabled state changed
  for (const flag of flags) {
    const reloadedFlag = flagsAfterFailure.data.find(
      (f) => f.code === flag.code,
    );
    const assuredReloadedFlag = typia.assert(reloadedFlag!);
    TestValidator.equals(
      `flag ${flag.code} enabled state unchanged due to rollback`,
      assuredReloadedFlag.enabled,
      flag.enabled,
    );
  }
  // 8. Perform a successful batch update with only valid codes toggled
  const toggleUpdates: IBatchUpdateItem[] = flags.map((flag) => ({
    code: flag.code,
    enabled: !flag.enabled,
  }));
  const updateResult =
    await api.functional.discussionBoard.superAdministrator.featureFlags.index(
      superAdminConnection,
      {
        body: {
          batchUpdate: toggleUpdates,
        } satisfies IDiscussionBoardFeatureFlag.IRequest,
      },
    );
  typia.assert(updateResult);
  // 9. Verify the updated flags have toggled enabled state
  for (const toggledFlag of toggleUpdates) {
    const flag = updateResult.data.find((f) => f.code === toggledFlag.code);
    const assuredFlag = typia.assert(flag!);
    TestValidator.equals(
      `flag ${assuredFlag.code} enabled state toggled`,
      assuredFlag.enabled,
      toggledFlag.enabled,
    );
  }
  // 10. Optionally: Check audit logging system if test APIs available or logs retrievable
  // NOTE: Audit log checking is typically done with separate API or DB query,
  // but since no API for logs is provided, making sure no partial update is visible suffices.
}
