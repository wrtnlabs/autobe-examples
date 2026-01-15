import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSaleCurrencyRate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleCurrencyRate";
import { prepare_random_community_platform_sale_currency_rate } from "../../../prepare/prepare_random_community_platform_sale_currency_rate";
import { generate_random_community_platform_salescurrencyrates_create } from "../../../generate/generate_random_community_platform_salescurrencyrates_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_currency_rate_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@wrtn.io`;
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // Step 2: Create a currency rate entry (USD to EUR)
  const usdToEurRate = {
    fromCurrency: "USD",
    toCurrency: "EUR",
    rate: 0.92,
    effectiveFrom: new Date().toISOString(),
  } satisfies ICommunityPlatformSaleCurrencyRate.ICreate;
  const createdRate =
    await generate_random_community_platform_salescurrencyrates_create(
      adminConnection,
      { body: usdToEurRate },
    );
  typia.assert(createdRate);
  TestValidator.equals(
    "created rate currency pair",
    createdRate.fromCurrency,
    "USD",
  );
  TestValidator.equals(
    "created rate target currency",
    createdRate.toCurrency,
    "EUR",
  );
  TestValidator.equals("created rate value", createdRate.rate, 0.92);
  // Step 3: Delete the currency rate by currency code
  const deletedRate =
    await api.functional.communityPlatform.admin.salescurrencyrates.erase(
      adminConnection,
      {
        currencyCode: createdRate.fromCurrency,
      },
    );
  typia.assert(deletedRate);
  // The verification step attempting to retrieve the deleted rate has been removed
  // because the API does not provide any endpoint to retrieve currency rates by currency code.
  // The only validation possible is that the delete operation succeeded, which we've already confirmed with typia.assert.
}
