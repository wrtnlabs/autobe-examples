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

export async function test_api_shipping_address_list_customer_filtered_page(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);
  const unique = RandomGenerator.alphabets(8);
  const targetCity = `Seoul-${unique}`;
  const targetCountry = `Korea-${unique}`;
  const otherCity = `Busan-${unique}`;
  const otherCountry = `Japan-${unique}`;
  const createdAddresses = await ArrayUtil.asyncMap(
    [
      {
        recipient_name: `Target Default ${unique}`,
        phone_number: RandomGenerator.mobile(),
        street_address: `101 ${RandomGenerator.paragraph({ sentences: 2 })}`,
        city: targetCity,
        state_province: `State-${unique}`,
        postal_code: `ZIP-${RandomGenerator.alphaNumeric(6)}`,
        country: targetCountry,
        is_default: true,
      },
      {
        recipient_name: `Target Secondary ${unique}`,
        phone_number: RandomGenerator.mobile(),
        street_address: `102 ${RandomGenerator.paragraph({ sentences: 2 })}`,
        city: targetCity,
        state_province: `State-${unique}`,
        postal_code: `ZIP-${RandomGenerator.alphaNumeric(6)}`,
        country: targetCountry,
        is_default: false,
      },
      {
        recipient_name: `Other City ${unique}`,
        phone_number: RandomGenerator.mobile(),
        street_address: `103 ${RandomGenerator.paragraph({ sentences: 2 })}`,
        city: otherCity,
        state_province: `State-${unique}`,
        postal_code: `ZIP-${RandomGenerator.alphaNumeric(6)}`,
        country: targetCountry,
        is_default: false,
      },
      {
        recipient_name: `Other Country ${unique}`,
        phone_number: RandomGenerator.mobile(),
        street_address: `104 ${RandomGenerator.paragraph({ sentences: 2 })}`,
        city: targetCity,
        state_province: `State-${unique}`,
        postal_code: `ZIP-${RandomGenerator.alphaNumeric(6)}`,
        country: otherCountry,
        is_default: false,
      },
    ],
    async (body) => {
      const created =
        await generate_random_shopping_mall_customer_shipping_addresses_create(
          customerConnection,
          {
            body,
          },
        );
      typia.assert<IShoppingMallShippingAddress>(created);
      return created;
    },
  );
  const createdDefaultAddresses = createdAddresses.filter(
    (address) => address.is_default === true,
  );
  TestValidator.equals(
    "exactly one created default address exists",
    createdDefaultAddresses.length,
    1,
  );
  const request = {
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 1 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    search: unique,
    city: targetCity,
    country: targetCountry,
    is_default: true,
  } satisfies IShoppingMallShippingAddress.IRequest;
  const page =
    await api.functional.shoppingMall.customer.shippingAddresses.index(
      customerConnection,
      {
        body: request,
      },
    );
  typia.assert<IPageIShoppingMallShippingAddress.ISummary>(page);
  TestValidator.equals(
    "pagination current page matches request",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "filtered default query returns one record total",
    page.pagination.records,
    1,
  );
  TestValidator.equals(
    "filtered default query has one total page",
    page.pagination.pages,
    1,
  );
  TestValidator.equals("page contains one row", page.data.length, 1);
  const expectedDefault = createdDefaultAddresses[0];
  typia.assert<IShoppingMallShippingAddress>(expectedDefault);
  const returned = page.data[0];
  typia.assert<IShoppingMallShippingAddress.ISummary>(returned);
  TestValidator.equals(
    "returned address matches created default id",
    returned.id,
    expectedDefault.id,
  );
  TestValidator.equals(
    "returned recipient name matches filter seed",
    returned.recipient_name,
    expectedDefault.recipient_name,
  );
  TestValidator.equals(
    "returned city matches filter",
    returned.city,
    targetCity,
  );
  TestValidator.equals(
    "returned country matches filter",
    returned.country,
    targetCountry,
  );
  TestValidator.equals(
    "returned address is default",
    returned.is_default,
    true,
  );
  TestValidator.predicate(
    "returned recipient name is present",
    returned.recipient_name.length > 0,
  );
  TestValidator.predicate(
    "returned phone number is present",
    returned.phone_number.length > 0,
  );
  TestValidator.predicate(
    "returned street address is present",
    returned.street_address.length > 0,
  );
  TestValidator.predicate("returned city is present", returned.city.length > 0);
  TestValidator.predicate(
    "returned state province is present",
    returned.state_province.length > 0,
  );
  TestValidator.predicate(
    "returned postal code is present",
    returned.postal_code.length > 0,
  );
  TestValidator.predicate(
    "returned country is present",
    returned.country.length > 0,
  );
  TestValidator.predicate(
    "returned item belongs to created customer scoped dataset",
    createdAddresses.some((address) => address.id === returned.id),
  );
  const broaderRequest = {
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    search: unique,
    city: targetCity,
    country: targetCountry,
  } satisfies IShoppingMallShippingAddress.IRequest;
  const broaderPage =
    await api.functional.shoppingMall.customer.shippingAddresses.index(
      customerConnection,
      {
        body: broaderRequest,
      },
    );
  typia.assert<IPageIShoppingMallShippingAddress.ISummary>(broaderPage);
  TestValidator.equals(
    "broader pagination current matches request",
    broaderPage.pagination.current,
    broaderRequest.page,
  );
  TestValidator.equals(
    "broader pagination limit matches request",
    broaderPage.pagination.limit,
    broaderRequest.limit,
  );
  TestValidator.equals(
    "broader filtered query returns two matching records total",
    broaderPage.pagination.records,
    2,
  );
  TestValidator.equals(
    "broader filtered page count is consistent",
    broaderPage.pagination.pages,
    1,
  );
  TestValidator.predicate(
    "broader page length does not exceed requested limit",
    broaderPage.data.length <= broaderRequest.limit,
  );
  const matchingCreated = createdAddresses.filter(
    (address) =>
      address.city === targetCity && address.country === targetCountry,
  );
  TestValidator.equals(
    "two created addresses match broader customer filters",
    matchingCreated.length,
    2,
  );
  broaderPage.data.forEach((item) => {
    typia.assert<IShoppingMallShippingAddress.ISummary>(item);
    TestValidator.equals(
      "broader item city matches filter",
      item.city,
      targetCity,
    );
    TestValidator.equals(
      "broader item country matches filter",
      item.country,
      targetCountry,
    );
    TestValidator.predicate(
      "broader item belongs to created customer scoped dataset",
      createdAddresses.some((address) => address.id === item.id),
    );
    TestValidator.predicate(
      "broader item has required summary fields",
      item.recipient_name.length > 0 &&
        item.phone_number.length > 0 &&
        item.street_address.length > 0 &&
        item.city.length > 0 &&
        item.state_province.length > 0 &&
        item.postal_code.length > 0 &&
        item.country.length > 0,
    );
  });
  TestValidator.predicate(
    "broader filtered page includes the created default address for identification",
    broaderPage.data.some(
      (item) => item.id === expectedDefault.id && item.is_default === true,
    ),
  );
}
