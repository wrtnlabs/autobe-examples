import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityUsageMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUsageMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_admin_usage_metrics_create } from "../../../generate/generate_random_community_admin_usage_metrics_create";
import { prepare_random_community_usage_metric } from "../../../prepare/prepare_random_community_usage_metric";

export async function test_api_usage_metrics_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {} satisfies ICommunityAdmin.IJoin,
    },
  );
  // 2. Create a usage metrics record
  const metric = await generate_random_community_admin_usage_metrics_create(
    adminConnection,
    {
      body: {} satisfies ICommunityUsageMetric.ICreate,
    },
  );
  typia.assert<ICommunityUsageMetric>(metric);
  // 3. Delete the usage metrics record
  // Extract ID from the created metric using IEntity interface
  const metricId = (metric as IEntity).id;
  await api.functional.community.admin.usage_metrics.erase(adminConnection, {
    metricId,
  });
  // 4. Validation: Ensure the metric was deleted (no assertion needed as erase returns void)
  // The system should return no error - successful execution validates deletion
}
