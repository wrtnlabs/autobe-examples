import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentReconciliation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentReconciliation";
import type { IShoppingMallPaymentReconciliationDetails } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentReconciliationDetails";
import type { IShoppingMallPaymentReconciliationMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentReconciliationMetadata";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_reconciliation_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create a fresh admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate realistic admin credentials
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const href: string = `https://${RandomGenerator.alphaNumeric(8)}.example.com/admin/join`;
  const referrer: string = `https://${RandomGenerator.alphaNumeric(8)}.example.com/admin/signup`;
  // Authenticate admin user via authorized join endpoint
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        href,
        referrer,
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Ensure admin authentication was successful and connection was updated
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  // Retrieve a specific payment reconciliation record using the authenticated admin connection
  // Generate a random reconciliation ID (UUID) as required by the endpoint
  const reconciliationId: string = typia.random<string & tags.Format<"uuid">>();
  // Make the API call to retrieve the payment reconciliation record
  const reconciliation: IShoppingMallPaymentReconciliation =
    await api.functional.shoppingMall.admin.payment_reconciliation.at(
      adminConnection,
      { reconciliationId },
    );
  // Validate the complete response structure using typia.assert()
  typia.assert(reconciliation);
}
