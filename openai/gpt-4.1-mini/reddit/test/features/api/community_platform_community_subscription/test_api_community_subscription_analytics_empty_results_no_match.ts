import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_subscription_analytics_empty_results_no_match(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies the admin analytics endpoint for community subscriptions when filters do not match any records.
  // 1. Prepare admin connection and authorize admin by join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {}, // ICommunityPlatformAdmin.IJoin is an empty object
  });
  // 2. Make a request with empty body to match no filters (empty request DTO)
  const output =
    await api.functional.communityPlatform.admin.analytics.communities.subscriptions.index(
      adminConnection,
      {
        body: {},
      },
    );
  // 3. Validate response structure and content
  typia.assert(output);
  // 4. Validate pagination metadata and data array
  TestValidator.equals("records count", output.pagination.records, 0);
  TestValidator.equals("pages count", output.pagination.pages, 0);
  TestValidator.predicate("empty data array", output.data.length === 0);
  // 5. Authorization Enforcement
  // Try calling the endpoint without admin privileges (base connection)
  await TestValidator.httpError("authorization required", 401, async () => {
    await api.functional.communityPlatform.admin.analytics.communities.subscriptions.index(
      { host: connection.host },
      { body: {} },
    );
  });
}
