import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemHealthMetricMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetricMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_system_health_metrics_metadata_create } from "../../../generate/generate_random_discussion_board_admin_system_health_metrics_metadata_create";
import { prepare_random_discussion_board_system_health_metric_metadatum } from "../../../prepare/prepare_random_discussion_board_system_health_metric_metadatum";

export async function test_api_system_health_metric_metadata_uniqueness_constraint(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Generate a random metric ID for testing
  const metricId = typia.random<string & tags.Format<"uuid">>();
  // Create initial metadata record using utility function
  const initialMetadata =
    await generate_random_discussion_board_admin_system_health_metrics_metadata_create(
      adminConnection,
      {
        params: { metricId },
        body: {
          key: RandomGenerator.alphabets(10),
          value: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(initialMetadata);
  // Attempt to create duplicate metadata with same key - should return 409 conflict
  await TestValidator.httpError(
    "duplicate metadata key should return 409 conflict",
    409,
    async () => {
      await generate_random_discussion_board_admin_system_health_metrics_metadata_create(
        adminConnection,
        {
          params: { metricId },
          body: {
            key: initialMetadata.key,
            value: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    },
  );
  // The initial metadata should remain unchanged and valid
  typia.assert(initialMetadata);
}
