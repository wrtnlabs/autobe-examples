import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerComplianceHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerComplianceHistory";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_compliance_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate random sellerId and recordId for compliance history
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const recordId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Retrieve compliance history record using admin connection
  const complianceRecord: IShoppingMallSellerComplianceHistory =
    await api.functional.shoppingMall.admin.sellers.compliance_history.at(
      adminConnection,
      {
        sellerId,
        recordId,
      },
    );
  typia.assert(complianceRecord);
  // Step 4: Validate compliance record structure
  TestValidator.equals(
    "event_type is present",
    complianceRecord.event_type,
    complianceRecord.event_type,
  );
  TestValidator.equals(
    "status is present",
    complianceRecord.status,
    complianceRecord.status,
  );
  TestValidator.equals(
    "reason is present",
    complianceRecord.reason,
    complianceRecord.reason,
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    new Date(complianceRecord.created_at).toISOString() ===
      complianceRecord.created_at,
  );
  // Step 5: Test that unauthenticated connection cannot access compliance history
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated user cannot access compliance history",
    async () => {
      await api.functional.shoppingMall.admin.sellers.compliance_history.at(
        guestConnection,
        {
          sellerId,
          recordId,
        },
      );
    },
  );
}
