import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemHealthMetricMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetricMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_system_health_metrics_metadata_create } from "../../../generate/generate_random_discussion_board_super_admin_system_health_metrics_metadata_create";
import { prepare_random_discussion_board_system_health_metric_metadatum } from "../../../prepare/prepare_random_discussion_board_system_health_metric_metadatum";

export async function test_api_system_health_metric_metadata_duplicate_key_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Create initial metadata record
  const metricId = typia.random<string & tags.Format<"uuid">>();
  const initialKey = RandomGenerator.alphabets(8);
  const initialValue = RandomGenerator.alphabets(12);
  const initialMetadata =
    await generate_random_discussion_board_super_admin_system_health_metrics_metadata_create(
      superAdminConnection,
      {
        params: { metricId },
        body: {
          key: initialKey,
          value: initialValue,
        } satisfies IDiscussionBoardSystemHealthMetricMetadatum.ICreate,
      },
    );
  typia.assert(initialMetadata);
  // 3. Attempt to create duplicate metadata with same key
  const duplicateValue = RandomGenerator.alphabets(12);
  await TestValidator.error("duplicate key conflict", async () => {
    await generate_random_discussion_board_super_admin_system_health_metrics_metadata_create(
      superAdminConnection,
      {
        params: { metricId },
        body: {
          key: initialKey,
          value: duplicateValue,
        } satisfies IDiscussionBoardSystemHealthMetricMetadatum.ICreate,
      },
    );
  });
  // 4. Verify that only the initial metadata exists (system state remains unchanged)
  TestValidator.equals(
    "metadata key uniqueness enforced",
    initialMetadata.key,
    initialKey,
  );
  TestValidator.equals(
    "metadata value unchanged",
    initialMetadata.value,
    initialValue,
  );
}
