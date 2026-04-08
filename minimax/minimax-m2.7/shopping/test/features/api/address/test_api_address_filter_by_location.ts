import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_address_filter_by_location(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create addresses in different cities and states
  const addressSeoul =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          city: "Seoul",
          state: "Gyeonggi",
          country: "South Korea",
        },
      },
    );
  typia.assert(addressSeoul);
  const addressBusan =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          city: "Busan",
          state: "Gyeongsang",
          country: "South Korea",
        },
      },
    );
  typia.assert(addressBusan);
  const addressIncheon =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          city: "Incheon",
          state: "Gyeonggi",
          country: "South Korea",
        },
      },
    );
  typia.assert(addressIncheon);
  // 3. Get all addresses for baseline
  const allAddresses =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      { body: {} },
    );
  typia.assert(allAddresses);
  TestValidator.equals("total addresses count", allAddresses.data.length, 3);
  // 4. Test citySearch filter - partial match on "Seoul"
  const seoulAddresses =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      { body: { citySearch: "Seoul" } },
    );
  typia.assert(seoulAddresses);
  TestValidator.equals(
    "only Seoul addresses returned",
    seoulAddresses.data.length,
    1,
  );
  TestValidator.equals(
    "city matches Seoul",
    seoulAddresses.data[0].city,
    "Seoul",
  );
  // 5. Test stateSearch filter - partial match on "Gyeonggi"
  const gyeonggiAddresses =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      { body: { stateSearch: "Gyeonggi" } },
    );
  typia.assert(gyeonggiAddresses);
  TestValidator.equals(
    "Gyeonggi state addresses returned",
    gyeonggiAddresses.data.length,
    2,
  );
  TestValidator.predicate(
    "all have Gyeonggi state",
    gyeonggiAddresses.data.every((a) => a.state === "Gyeonggi"),
  );
  // 6. Test countrySearch filter - exact match
  const koreaAddresses =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      { body: { countrySearch: "South Korea" } },
    );
  typia.assert(koreaAddresses);
  TestValidator.equals(
    "all addresses in South Korea",
    koreaAddresses.data.length,
    3,
  );
  // 7. Test combined filters
  const seoulInKorea =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      { body: { citySearch: "Seoul", countrySearch: "South Korea" } },
    );
  typia.assert(seoulInKorea);
  TestValidator.equals("Seoul in South Korea", seoulInKorea.data.length, 1);
  TestValidator.equals("city is Seoul", seoulInKorea.data[0].city, "Seoul");
  // 8. Test non-existent search returns empty
  const nonexistent =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      { body: { citySearch: "Tokyo" } },
    );
  typia.assert(nonexistent);
  TestValidator.equals("no Tokyo addresses", nonexistent.data.length, 0);
}