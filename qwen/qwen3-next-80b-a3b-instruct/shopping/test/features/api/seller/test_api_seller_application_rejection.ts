import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrativeRejectionReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrativeRejectionReason";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryConfirmation";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_application_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Get a pending seller ID
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Reject the seller application with a valid rejection reason (min 10 characters)
  const rejectionReason: IShoppingMallAdministrativeRejectionReason = {
    reason: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IShoppingMallAdministrativeRejectionReason;
  // Step 4: Call reject API with adminConnection
  const result: IShoppingMallDeliveryConfirmation =
    await api.functional.shoppingMall.admin.admins.sellers.reject(
      adminConnection,
      {
        sellerId,
        body: rejectionReason,
      },
    );
  typia.assert(result);
  // Step 5: Validate response - only use typia.assert() for validation
  TestValidator.equals(
    "status should be 'rejected'",
    result.status,
    "rejected",
  );
}
