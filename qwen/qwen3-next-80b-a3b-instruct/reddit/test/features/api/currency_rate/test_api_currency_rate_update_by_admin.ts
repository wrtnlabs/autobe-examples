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
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_currency_rate_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and join as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Update EUR currency rate to 1.0842 using admin connection
  const updatedRate =
    await api.functional.communityPlatform.admin.salescurrencyrates.update(
      adminConnection,
      {
        currencyCode: "EUR",
        body: {
          rate: 1.0842,
        } satisfies ICommunityPlatformSaleCurrencyRate.IUpdate,
      },
    );
  // Step 3: Validate response structure and type with typia.assert
  typia.assert(updatedRate);
  // Step 4: Validate business logic: rate is 1.0842, from currency is EUR, to currency is USD (system default)
  TestValidator.equals(
    "updated currency rate is 1.0842",
    updatedRate.rate,
    1.0842,
  );
  TestValidator.equals("currency code is EUR", updatedRate.fromCurrency, "EUR");
  TestValidator.equals("target currency is USD", updatedRate.toCurrency, "USD");
}
