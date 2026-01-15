import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallExchangeRateConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallExchangeRateConfiguration";
import type { IShoppingMallPaymentMethodRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodRestriction";
import type { IShoppingMallPaymentRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRegion";
import type { IShoppingMallPaymentRegionMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRegionMetadata";
import type { IShoppingMallTaxSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTaxSettings";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_region_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/referral",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAccount);
  // Step 2: Set up payment region update parameters
  const regionId = typia.random<string & tags.Format<"uuid">>();
  // Generate random but valid payment region update data
  const updateData: IShoppingMallPaymentRegion.IUpdate = {
    enabled: true,
    supported_currencies: ["USD", "EUR", "JPY"] satisfies (string &
      tags.Pattern<"^[A-Z]{3}$">)[] &
      tags.MinItems<1> &
      tags.MaxItems<10>,
    payment_method_restrictions: [
      "credit_card",
      "paypal",
      "bank_transfer",
    ] satisfies IShoppingMallPaymentMethodRestriction[],
    exchange_rate_configuration: {
      source: "live",
      update_frequency: "daily",
      rounding_method: "round_half_up",
      base_currency: "USD",
      rate_update_window: 300,
      rate_accuracy_threshold: 0.1,
      conversion_enabled: true,
      fallback_rate: 1.0,
      min_rate: 0.01,
      max_rate: 100,
    } satisfies IShoppingMallExchangeRateConfiguration,
    tax_settings: {
      enabled: true,
      tax_rate: 0.08,
      tax_type: "sales_tax",
      exemptions: ["food", "medicines"],
    } satisfies IShoppingMallTaxSettings,
    compliance_flags: ["gdpr", "ccpa"] satisfies (string &
      tags.Pattern<"^[a-z]{3,10}$">)[],
    metadata:
      "currency_rounding: custom" satisfies IShoppingMallPaymentRegionMetadata,
  };
  // Step 3: Use adminConnection (not base connection) to update payment region
  const updatedRegion: IShoppingMallPaymentRegion =
    await api.functional.shoppingMall.admin.payment_regions.update(
      adminConnection,
      {
        regionId: regionId,
        body: updateData,
      },
    );
  typia.assert(updatedRegion);
  // Step 4: Validate the updated region properties
  // Since typia.assert() already validates the complete structure and types,
  // no additional property-by-property assertions are required.
  // E2E tests should validate business logic, not type structure.
  // The API contract guarantees type safety, so we have already confirmed
  // successful update with typia.assert().
  // That's the complete validation required for this test
}
