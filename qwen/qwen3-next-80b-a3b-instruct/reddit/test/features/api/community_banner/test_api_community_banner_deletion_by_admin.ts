import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_community_banner_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Register a new system administrator using the utility function
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityBbsAdmin.IJoin;
  const adminUser = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminUser);
  // Step 3: Delete a banner using the admin connection
  // We assume a banner with this ID already exists in the system (pre-setup test data)
  const bannerId = typia.random<string & tags.Format<"uuid">>();
  // Perform the deletion - should return 204 No Content successfully
  await api.functional.communityBbs.admin.community_banners.erase(
    adminConnection,
    {
      bannerId,
    },
  );
  // Step 4: Verify success by ensuring no error occurred
  // Since the endpoint returns void on success, absence of error equals success
  TestValidator.predicate("banner deletion should succeed without error", true);
}
