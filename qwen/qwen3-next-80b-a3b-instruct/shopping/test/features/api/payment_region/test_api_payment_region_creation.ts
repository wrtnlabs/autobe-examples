import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRegion";
import { prepare_random_shopping_mall_payment_region } from "../../../prepare/prepare_random_shopping_mall_payment_region";
import { generate_random_shopping_mall_admin_payment_regions_create } from "../../../generate/generate_random_shopping_mall_admin_payment_regions_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_region_creation(
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
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create payment region using admin connection
  // Define a set of valid ISO 3166 alpha-2 region codes
  const validRegionCodes = [
    "US",
    "JP",
    "GB",
    "DE",
    "FR",
    "CA",
    "AU",
    "CN",
    "KR",
    "SG",
  ] as const;
  // Define a set of valid ISO 4217 currency codes
  const validCurrencyCodes = [
    "USD",
    "JPY",
    "GBP",
    "EUR",
    "CAD",
    "AUD",
    "CNY",
    "KRW",
    "SGD",
    "HKD",
  ] as const;
  // Define a set of valid gateway identifiers
  const validGateways = [
    "stripe",
    "paypal",
    "adyen",
    "square",
    "authorize_net",
  ] as const;
  // Define a set of valid tax regulation identifiers
  const validTaxRegulations = [
    "US-CA",
    "EU-VAT",
    "JP-TAX",
    "GB-VAT",
    "CA-GST",
  ] as const;
  // Define a set of valid localization rules
  const validLocalizations = [
    "en-US",
    "ja-JP",
    "ko-KR",
    "de-DE",
    "fr-FR",
  ] as const;
  const paymentRegion: IShoppingMallPaymentRegion =
    await generate_random_shopping_mall_admin_payment_regions_create(
      adminConnection,
      {
        body: {
          region_code: RandomGenerator.pick(validRegionCodes),
          currency_code: RandomGenerator.pick(validCurrencyCodes),
          primary_gateway: RandomGenerator.pick(validGateways),
          secondary_gateways: RandomGenerator.pick([
            undefined,
            [
              RandomGenerator.pick(validGateways),
              RandomGenerator.pick(validGateways),
            ] as any,
          ]),
          tax_regulations: RandomGenerator.pick(validTaxRegulations),
          fraud_threshold: typia.random<number & tags.Minimum<0>>(),
          enable_card_tokenization: RandomGenerator.pick([true, false]),
          localization_rules: RandomGenerator.pick(validLocalizations),
          data_retention_period: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<12> & tags.Maximum<120>
          >(),
          enabled: RandomGenerator.pick([true, false]),
        } satisfies IShoppingMallPaymentRegion.ICreate,
      },
    );
  typia.assert(paymentRegion);
}