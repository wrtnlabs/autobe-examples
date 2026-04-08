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

export async function test_api_address_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(authResponse);
  // 2. Create member-specific connection for subsequent API calls
  const customerConnection: api.IConnection = { host: connection.host };
  // 3. Call addresses endpoint with default pagination parameters
  const addressesResponse =
    await api.functional.ecommerceMall.member.addresses.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(addressesResponse);
  // 4. Verify pagination metadata
  const pagination = addressesResponse.pagination;
  TestValidator.equals("pagination current page", pagination.current, 1);
  TestValidator.equals("pagination limit default", pagination.limit, 20);
  TestValidator.equals("pagination total records", pagination.records, 0);
  TestValidator.equals("pagination total pages", pagination.pages, 0);
  // 5. Verify empty data array (fresh member has no saved addresses)
  TestValidator.equals(
    "empty address data array",
    addressesResponse.data.length,
    0,
  );
  // 6. Verify data array type
  const emptyData: IEcommerceMallCustomerAddress.ISummary[] =
    addressesResponse.data;
  typia.assert(emptyData);
}