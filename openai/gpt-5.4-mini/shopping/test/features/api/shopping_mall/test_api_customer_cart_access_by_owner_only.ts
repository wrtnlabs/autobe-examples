import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cart_access_by_owner_only(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const otherConnection: api.IConnection = { host: connection.host };
  const ownerEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const otherEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const ownerPassword = RandomGenerator.alphaNumeric(12);
  const otherPassword = RandomGenerator.alphaNumeric(12);
  const ownerAuthorized = await authorize_customer_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(ownerAuthorized);
  const otherAuthorized = await authorize_customer_join(otherConnection, {
    body: {
      email: otherEmail,
      password: otherPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(otherAuthorized);
  const ownerCart = await api.functional.shoppingMall.customer.carts.index(
    ownerConnection,
    {
      body: {} satisfies IShoppingMallCart.IRequest,
    },
  );
  typia.assert(ownerCart);
  const otherCart = await api.functional.shoppingMall.customer.carts.index(
    otherConnection,
    {
      body: {} satisfies IShoppingMallCart.IRequest,
    },
  );
  typia.assert(otherCart);
  TestValidator.predicate(
    "owner cart response is isolated to the owner session",
    ownerCart.data.every((cart) => cart.customer.id === ownerAuthorized.id),
  );
  TestValidator.predicate(
    "other cart response is isolated to the other session",
    otherCart.data.every((cart) => cart.customer.id === otherAuthorized.id),
  );
  TestValidator.notEquals(
    "different customer sessions must not resolve to the same cart owner",
    ownerAuthorized.id,
    otherAuthorized.id,
  );
}
