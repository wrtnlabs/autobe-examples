import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardFeatureFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_feature_flags_batch_update_enabled_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authenticate
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminJoinConnection, {
    body: {} /* use default random join info */,
  });
  // Create authenticated connection for admin
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Retrieve current feature flags
  const currentFlags =
    await api.functional.discussionBoard.administrator.featureFlags.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(currentFlags);
  // 3. Pick at least two feature flags to toggle their enabled status
  const flagsToUpdate = currentFlags.data.slice(0, 2);
  if (flagsToUpdate.length < 2) {
    throw new Error("Insufficient feature flags to test batch update");
  }
  // Construct batch update payload with toggled enabled statuses
  const batchUpdates: IDiscussionBoardFeatureFlag.IBatchUpdate[] =
    flagsToUpdate.map((flag) => ({
      code: flag.code,
      enabled: !flag.enabled,
    }));
  // 4. Perform batch update
  const updateResponse =
    await api.functional.discussionBoard.administrator.featureFlags.index(
      adminConnection,
      {
        body: {
          batchUpdate: batchUpdates,
        } satisfies IDiscussionBoardFeatureFlag.IRequest,
      },
    );
  typia.assert(updateResponse);
  // 5. Verify all flags were updated atomically
  await Promise.all(
    flagsToUpdate.map(async (flag) => {
      const found = updateResponse.data.find((f) => f.code === flag.code);
      if (found === undefined)
        throw new Error("Updated flag not found in response");
      TestValidator.equals(
        `flag ${flag.code} enabled toggled`,
        found.enabled,
        !flag.enabled,
      );
    }),
  );
  // 6. Retrieve flags again to verify persisted state
  const postUpdateFlags =
    await api.functional.discussionBoard.administrator.featureFlags.index(
      adminConnection,
      {
        body: {
          code: flagsToUpdate[0].code,
        } satisfies IDiscussionBoardFeatureFlag.IRequest,
      },
    );
  typia.assert(postUpdateFlags);
  if (postUpdateFlags.data.length === 0) {
    throw new Error("Post-update flags retrieval returned empty data");
  }
  TestValidator.equals(
    `post-update flag ${flagsToUpdate[0].code} enabled state`,
    postUpdateFlags.data[0].enabled,
    !flagsToUpdate[0].enabled,
  );
  // 7. Test atomic rollback behavior by sending conflicting batch update
  // For example, send two updates for the same code with different enabled statuses
  const conflictingBatchUpdate: IDiscussionBoardFeatureFlag.IBatchUpdate[] = [
    { code: flagsToUpdate[0].code, enabled: true },
    { code: flagsToUpdate[0].code, enabled: false },
  ];
  await TestValidator.error(
    "conflicting batch update should cause error",
    async () => {
      await api.functional.discussionBoard.administrator.featureFlags.index(
        adminConnection,
        {
          body: {
            batchUpdate: conflictingBatchUpdate,
          } satisfies IDiscussionBoardFeatureFlag.IRequest,
        },
      );
    },
  );
}
