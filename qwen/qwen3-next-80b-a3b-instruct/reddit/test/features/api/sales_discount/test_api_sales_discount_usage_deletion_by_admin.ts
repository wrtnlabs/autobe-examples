import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSalesDiscountUse } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSalesDiscountUse";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_sales_discount_usage_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin account using the join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinData = {
    email: adminEmail,
    href: "https://example.com/admin/join",
    referrer: "https://example.com",
    ip: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminJoinData,
  });
  typia.assert(adminAuth);
  // Step 2: Generate a valid discount usage record structure and extract its usage_id
  // Since we have no API to create records, use typia.random to get a realistic structure
  const mockDiscountUse = typia.random<ICommunityPlatformSalesDiscountUse>();
  const usageId = mockDiscountUse.usage_id;
  // Step 3: Use the admin connection to delete the discount usage record
  const deletedRecord =
    await api.functional.communityPlatform.salesdiscountuses.erase(
      adminConnection,
      { usageId },
    );
  typia.assert(deletedRecord);
  // Step 4: Create an unauthenticated connection to simulate a non-admin user
  // Try to delete the same discount usage record as a non-admin user
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "non-admin user cannot delete discount usage record",
    async () => {
      await api.functional.communityPlatform.salesdiscountuses.erase(
        guestConnection,
        { usageId },
      );
    },
  );
}
