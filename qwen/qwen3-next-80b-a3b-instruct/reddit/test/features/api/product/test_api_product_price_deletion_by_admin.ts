import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_price_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate admin via join (mandatory prerequisite)
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // Step 3: Generate valid productCode and priceId for deletion
  // Both must be valid UUID format strings for the endpoint
  const productCode: string = typia.random<string & tags.Format<"uuid">>();
  const priceId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Execute price deletion by admin (DELETE endpoint)
  // This deletes the price record permanently and has no response body
  await api.functional.communityPlatform.admin.products.prices.erase(
    adminConnection, // ✅ Use adminConnection, NOT base connection
    {
      productCode,
      priceId,
    },
  );
  // Step 5: Verification - Successful deletion returns 204 No Content
  // Since function returns void, we don't need to assert response data
  // The successful execution without error confirms the operation completed
  // No need to assert the result as it's void - deletion is validated by absence of error
}
