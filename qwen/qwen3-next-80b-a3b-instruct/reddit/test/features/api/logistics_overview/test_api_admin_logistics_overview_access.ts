import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformLogisticsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformLogisticsOverview";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_logistics_overview_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate as admin using the authorization utility function
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // Step 3: Access the logistics overview endpoint using the authenticated admin connection
  const logisticsOverview: ICommunityPlatformLogisticsOverview =
    await api.functional.communityPlatform.admin.dashboard.logistics.overview.index(
      adminConnection,
    );
  // Step 4: Validate the response matches the expected schema using typia.assert
  typia.assert(logisticsOverview);
  // Step 5: Verify the response is an empty object as per the schema definition
  TestValidator.equals(
    "logistics overview is empty object",
    Object.keys(logisticsOverview).length,
    0,
  );
}
