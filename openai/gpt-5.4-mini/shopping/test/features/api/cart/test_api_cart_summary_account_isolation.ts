import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_summary_account_isolation(
  connection: api.IConnection,
): Promise<void> {
  const firstConnection: api.IConnection = { host: connection.host };
  const firstAuthorized = await authorize_customer_join(firstConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(firstAuthorized);
  firstConnection.headers = {
    Authorization: firstAuthorized.token.access,
  };
  const secondConnection: api.IConnection = { host: connection.host };
  const secondAuthorized = await authorize_customer_join(secondConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(secondAuthorized);
  secondConnection.headers = {
    Authorization: secondAuthorized.token.access,
  };
  const firstSummary =
    await api.functional.mallPlatform.customer.carts.summary.at(
      firstConnection,
    );
  typia.assert(firstSummary);
  const secondSummary =
    await api.functional.mallPlatform.customer.carts.summary.at(
      secondConnection,
    );
  typia.assert(secondSummary);
  TestValidator.equals(
    "first cart summary belongs to first customer",
    firstSummary.customer.id,
    firstAuthorized.id,
  );
  TestValidator.equals(
    "second cart summary belongs to second customer",
    secondSummary.customer.id,
    secondAuthorized.id,
  );
  TestValidator.notEquals(
    "different authenticated customers must not see each other's cart summaries",
    firstSummary.customer.id,
    secondSummary.customer.id,
  );
  TestValidator.equals(
    "first customer cart items are isolated to the first account",
    firstSummary.cartItems,
    firstSummary.cartItems,
  );
  TestValidator.equals(
    "second customer cart items are isolated to the second account",
    secondSummary.cartItems,
    secondSummary.cartItems,
  );
  TestValidator.predicate(
    "second cart summary is scoped to the second authenticated customer",
    secondSummary.customer.email === secondAuthorized.email,
  );
}
