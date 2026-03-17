import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_shipping_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_shipping_addresses_create";
import { prepare_random_shopping_mall_shipping_address } from "../../../prepare/prepare_random_shopping_mall_shipping_address";

export async function test_api_shipping_address_list_customer_scope_isolated(
  connection: api.IConnection,
): Promise<void> {
  const sharedCity = `ScopeCity-${RandomGenerator.alphabets(6)}`;
  const sharedState = `ScopeState-${RandomGenerator.alphabets(6)}`;
  const sharedCountry = `ScopeCountry-${RandomGenerator.alphabets(6)}`;
  const sharedKeyword = `scope-${RandomGenerator.alphabets(8)}`;
  const requestedPage = 1 satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const requestedLimit = 100 satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const customerOneConnection: api.IConnection = { host: connection.host };
  const customerOne = await authorize_customer_join(customerOneConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerOne);
  const foreignAddress =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerOneConnection,
      {
        body: {
          recipient_name: `Foreign Recipient ${sharedKeyword}`,
          phone_number: RandomGenerator.mobile(),
          street_address: `Foreign Street ${sharedKeyword}`,
          city: sharedCity,
          state_province: sharedState,
          postal_code: `F-${RandomGenerator.alphaNumeric(6)}`,
          country: sharedCountry,
          is_default: true,
        } satisfies IShoppingMallShippingAddress.ICreate,
      },
    );
  typia.assert<IShoppingMallShippingAddress>(foreignAddress);
  const customerTwoConnection: api.IConnection = { host: connection.host };
  const customerTwo = await authorize_customer_join(customerTwoConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerTwo);
  const ownAddressOne =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerTwoConnection,
      {
        body: {
          recipient_name: `Own Recipient ${sharedKeyword}`,
          phone_number: RandomGenerator.mobile(),
          street_address: `Own Street ${sharedKeyword}`,
          city: sharedCity,
          state_province: sharedState,
          postal_code: `O-${RandomGenerator.alphaNumeric(6)}`,
          country: sharedCountry,
          is_default: true,
        } satisfies IShoppingMallShippingAddress.ICreate,
      },
    );
  typia.assert<IShoppingMallShippingAddress>(ownAddressOne);
  const ownAddressTwo =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerTwoConnection,
      {
        body: {
          recipient_name: `Own Alternate ${sharedKeyword}`,
          phone_number: RandomGenerator.mobile(),
          street_address: `Own Alternate Street ${sharedKeyword}`,
          city: sharedCity,
          state_province: sharedState,
          postal_code: `P-${RandomGenerator.alphaNumeric(6)}`,
          country: sharedCountry,
          is_default: false,
        } satisfies IShoppingMallShippingAddress.ICreate,
      },
    );
  typia.assert<IShoppingMallShippingAddress>(ownAddressTwo);
  const page =
    await api.functional.shoppingMall.customer.shippingAddresses.index(
      customerTwoConnection,
      {
        body: {
          search: sharedKeyword,
          city: sharedCity,
          state_province: sharedState,
          country: sharedCountry,
          page: requestedPage,
          limit: requestedLimit,
        } satisfies IShoppingMallShippingAddress.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallShippingAddress.ISummary>(page);
  const customerTwoIds = [ownAddressOne.id, ownAddressTwo.id];
  TestValidator.predicate(
    "response includes first current customer address",
    ArrayUtil.has(page.data, (record) => record.id === ownAddressOne.id),
  );
  TestValidator.predicate(
    "response includes second current customer address",
    ArrayUtil.has(page.data, (record) => record.id === ownAddressTwo.id),
  );
  TestValidator.predicate(
    "response excludes foreign customer address id",
    page.data.every((record) => record.id !== foreignAddress.id),
  );
  TestValidator.predicate(
    "response excludes foreign customer unique delivery details",
    page.data.every(
      (record) =>
        record.recipient_name !== foreignAddress.recipient_name &&
        record.phone_number !== foreignAddress.phone_number &&
        record.street_address !== foreignAddress.street_address &&
        record.postal_code !== foreignAddress.postal_code,
    ),
  );
  TestValidator.predicate(
    "all listed ids belong to authenticated customer records",
    page.data.every((record) => customerTwoIds.includes(record.id)),
  );
  TestValidator.equals(
    "pagination current page matches request",
    page.pagination.current,
    requestedPage,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    requestedLimit,
  );
  TestValidator.predicate(
    "pagination records is positive",
    page.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    page.pagination.pages >= 1,
  );
}
