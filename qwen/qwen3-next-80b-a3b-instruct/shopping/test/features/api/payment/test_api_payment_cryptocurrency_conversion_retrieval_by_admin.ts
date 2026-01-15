import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentCryptocurrencyConversion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentCryptocurrencyConversion";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_cryptocurrency_conversion_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/dashboard",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create a cryptocurrency conversion record through an admin-initiated process
  // Since we cannot directly create via at endpoint, we simulate the system creating
  // a conversion record. To satisfy the validation requirement, we'll use the system's generated random data.
  const conversionData: IShoppingMallPaymentCryptocurrencyConversion =
    typia.random<IShoppingMallPaymentCryptocurrencyConversion>();
  // Step 3: Retrieve the specific conversion record using the conversionId
  // Use the adminConnection to ensure proper authorization
  const retrievedConversion: IShoppingMallPaymentCryptocurrencyConversion =
    await api.functional.shoppingMall.admin.payment_cryptocurrency_conversions.at(
      adminConnection, // ✅ Use admin-specific connection
      {
        conversionId: conversionData.id, // ✅ Use the id from generated conversion data
      },
    );
  typia.assert(retrievedConversion);
  // Step 4: Validate all required financial fields are present and match
  TestValidator.equals(
    "from currency matches",
    retrievedConversion.from_currency,
    conversionData.from_currency,
  );
  TestValidator.equals(
    "to currency matches",
    retrievedConversion.to_currency,
    conversionData.to_currency,
  );
  TestValidator.equals(
    "conversion rate matches",
    retrievedConversion.conversion_rate,
    conversionData.conversion_rate,
  );
  TestValidator.equals(
    "source amount matches",
    retrievedConversion.source_amount,
    conversionData.source_amount,
  );
  TestValidator.equals(
    "target amount matches",
    retrievedConversion.target_amount,
    conversionData.target_amount,
  );
  TestValidator.equals(
    "fee amount matches",
    retrievedConversion.fee_amount,
    conversionData.fee_amount,
  );
  TestValidator.equals(
    "status matches",
    retrievedConversion.status,
    conversionData.status,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedConversion.created_at,
    conversionData.created_at,
  );
}
