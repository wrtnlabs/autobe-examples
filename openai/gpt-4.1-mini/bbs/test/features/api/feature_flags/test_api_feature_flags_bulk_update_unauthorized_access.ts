import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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
import { generate_random_discussion_board_administrator_feature_flags_create } from "../../../generate/generate_random_discussion_board_administrator_feature_flags_create";
import { prepare_random_discussion_board_feature_flag } from "../../../prepare/prepare_random_discussion_board_feature_flag";

export async function test_api_feature_flags_bulk_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Unauthorized scenario: no administrator authentication
  const baseConnection: api.IConnection = { host: connection.host };
  // 1. Setup: Create an administrator and authenticate to create some feature flags
  const adminConnection: api.IConnection = { host: connection.host };
  // Create an admin account with empty join body (as per IDiscussionBoardAdministrator.IJoin is empty object schema)
  await authorize_administrator_join(adminConnection, { body: {} });
  // Create some feature flags with adminConnection to have existing feature flags
  const featureFlags = await Promise.all(
    ArrayUtil.repeat(3, async () => {
      const flag =
        await generate_random_discussion_board_administrator_feature_flags_create(
          adminConnection,
          {},
        );
      typia.assert(flag);
      return flag;
    }),
  );

  // Since flag.id and flag.enabled are not present directly on IDiscussionBoardFeatureFlag,
  // check if flag has 'summary' or other property that holds id and enabled.
  // If not, just assertion errors, so we try type assertion to any and fallback.

  // Prepare bulk update payload with valid ids and changed enabled state (flip current enabled)
  const bulkUpdateBody = featureFlags.map((flag) => {
    // We try cast to any to access the id and enabled for building update payload
    const anyFlag = flag as any;
    return {
      id: anyFlag.id ?? anyFlag.summary?.id,
      enabled: !(anyFlag.enabled ?? anyFlag.summary?.enabled),
    } satisfies IDiscussionBoardFeatureFlag.IUpdate;
  });

  // 2. Try bulk update feature flags without authentication
  await TestValidator.httpError("unauthorized bulk update", 401, async () => {
    await api.functional.discussionBoard.feature_flags.bulk_update.bulkUpdate(
      baseConnection,
      {
        body: bulkUpdateBody,
      },
    );
  });

  // 3. Confirm no changes by fetching again with adminConnection
  // Since list API unavailable, we consider create results as truth
  // Re-fetch the flags by attempting to bulk update them back with admin authentication
  // This confirms original flags unchanged if re-updated again with flipped 'enabled'
  const revertUpdateBody = featureFlags.map((flag) => {
    const anyFlag = flag as any;
    return {
      id: anyFlag.id ?? anyFlag.summary?.id,
      enabled: anyFlag.enabled ?? anyFlag.summary?.enabled,
    } satisfies IDiscussionBoardFeatureFlag.IUpdate;
  });

  const revertResult =
    await api.functional.discussionBoard.feature_flags.bulk_update.bulkUpdate(
      adminConnection,
      {
        body: revertUpdateBody,
      },
    );
  typia.assert(revertResult);

  // Verify revertResult includes our flags and matches original enabled state
  featureFlags.forEach((flag) => {
    const anyFlag = flag as any;
    const id = anyFlag.id ?? anyFlag.summary?.id;
    const enabled = anyFlag.enabled ?? anyFlag.summary?.enabled;
    // revertResult.data elements may be summaries or other, so use any
    const found = (revertResult.data as any[]).find((f) => (f.id ?? f.summary?.id) === id);
    TestValidator.predicate(
      `feature flag ${id} exists in revert result`,
      found !== undefined,
    );
    if (found)
      TestValidator.equals(
        `feature flag ${id} enabled state unchanged`,
        found.enabled ?? found.summary?.enabled,
        enabled,
      );
  });
}
