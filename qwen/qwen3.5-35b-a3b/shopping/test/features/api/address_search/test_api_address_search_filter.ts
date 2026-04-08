import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_member_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_member_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";

export async function test_api_address_search_filter(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(joinResult);
  const address1 =
    await generate_random_ecommerce_mall_member_customer_addresses_create(
      memberConnection,
      {
        body: {
          recipient_name: "John Smith",
          city: "Seoul",
          phone: RandomGenerator.mobile(),
          street: typia.random<string & tags.MaxLength<200>>(),
          state: typia.random<string & tags.MaxLength<100>>(),
          postal_code: typia.random<string & tags.MaxLength<20>>(),
          country: typia.random<string & tags.MaxLength<100>>(),
          is_default: true,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address1);
  const address2 =
    await generate_random_ecommerce_mall_member_customer_addresses_create(
      memberConnection,
      {
        body: {
          recipient_name: "Jane Doe",
          city: "Busan",
          phone: RandomGenerator.mobile(),
          street: typia.random<string & tags.MaxLength<200>>(),
          state: typia.random<string & tags.MaxLength<100>>(),
          postal_code: typia.random<string & tags.MaxLength<20>>(),
          country: typia.random<string & tags.MaxLength<100>>(),
          is_default: false,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address2);
  const address3 =
    await generate_random_ecommerce_mall_member_customer_addresses_create(
      memberConnection,
      {
        body: {
          recipient_name: "John Doe",
          city: "Incheon",
          phone: RandomGenerator.mobile(),
          street: typia.random<string & tags.MaxLength<200>>(),
          state: typia.random<string & tags.MaxLength<100>>(),
          postal_code: typia.random<string & tags.MaxLength<20>>(),
          country: typia.random<string & tags.MaxLength<100>>(),
          is_default: false,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address3);
  const address4 =
    await generate_random_ecommerce_mall_member_customer_addresses_create(
      memberConnection,
      {
        body: {
          recipient_name: "Johnny Smith",
          city: "Daegu",
          phone: RandomGenerator.mobile(),
          street: typia.random<string & tags.MaxLength<200>>(),
          state: typia.random<string & tags.MaxLength<100>>(),
          postal_code: typia.random<string & tags.MaxLength<20>>(),
          country: typia.random<string & tags.MaxLength<100>>(),
          is_default: false,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address4);
  const searchResult1 =
    await api.functional.ecommerceMall.member.addresses.index(
      memberConnection,
      {
        body: {
          recipient_name: "John",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.equals(
    "recipient name search count",
    searchResult1.pagination.records,
    3,
  );
  TestValidator.equals(
    "recipient name search data length",
    searchResult1.data.length,
    3,
  );
  const recipientNames = searchResult1.data.map((a) => a.recipient_name);
  TestValidator.predicate(
    "John Smith found",
    recipientNames.includes("John Smith"),
  );
  TestValidator.predicate(
    "John Doe found",
    recipientNames.includes("John Doe"),
  );
  TestValidator.predicate(
    "Johnny Smith found",
    recipientNames.includes("Johnny Smith"),
  );
  const searchResult2 =
    await api.functional.ecommerceMall.member.addresses.index(
      memberConnection,
      {
        body: {
          city: "Seou",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(searchResult2);
  TestValidator.equals(
    "city search count",
    searchResult2.pagination.records,
    1,
  );
  TestValidator.equals("city search data length", searchResult2.data.length, 1);
  TestValidator.equals(
    "city search first record",
    searchResult2.data[0].city,
    "Seoul",
  );
  const searchResult3 =
    await api.functional.ecommerceMall.member.addresses.index(
      memberConnection,
      {
        body: {
          recipient_name: "John",
          city: "Seoul",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(searchResult3);
  TestValidator.equals(
    "combined filter count",
    searchResult3.pagination.records,
    1,
  );
  TestValidator.equals(
    "combined filter data length",
    searchResult3.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter recipient",
    searchResult3.data[0].recipient_name,
    "John Smith",
  );
  TestValidator.equals(
    "combined filter city",
    searchResult3.data[0].city,
    "Seoul",
  );
  const searchResult4 =
    await api.functional.ecommerceMall.member.addresses.index(
      memberConnection,
      {
        body: {
          recipient_name: "NonExistent",
          city: "NonExistent",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(searchResult4);
  TestValidator.equals(
    "empty search count",
    searchResult4.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search data length",
    searchResult4.data.length,
    0,
  );
}
