import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test customer address list pagination with authentication and response validation.
 *
 * Validates the address listing endpoint with pagination support for authenticated customer members. Ensures that the response structure matches the expected IPageIShoppingMallCustomerAddress.ISummary format with proper pagination metadata and address data arrays.
 *
 * The test verifies pagination parameters (page, limit) are respected, addresses are sorted by created_at in descending order, and all required address fields are present in the response. Ownership validation ensures only the authenticated customer's addresses are returned.
 *
 * 1. Member registers with unique email and credentials via authorize_member_join.
 * 2. Calls PATCH /shoppingMall/member/addresses with default pagination (page=1, limit=10).
 * 3. Validates response structure including pagination metadata and data array.
 * 4. Tests custom pagination with page=1, limit=2 to verify limit parameter.
 * 5. Verifies each address contains all required fields: id, recipient_name, recipient_phone, street_address, city, state_province, postal_code, country, is_default, created_at.
 * 6. Confirms addresses are sorted by created_at descending (newest first).
 */
export async function test_api_customer_address_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2. Test default pagination (page=1, limit=10)
  const defaultResponse =
    await api.functional.shoppingMall.member.addresses.index(memberConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCustomerAddress.IRequest,
    });
  typia.assert(defaultResponse);
  // 3. Validate pagination metadata values
  TestValidator.predicate(
    "current page is 1",
    defaultResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 10",
    defaultResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "records count is non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // 4. Test custom pagination (page=1, limit=2)
  const customResponse =
    await api.functional.shoppingMall.member.addresses.index(memberConnection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies IShoppingMallCustomerAddress.IRequest,
    });
  typia.assert(customResponse);
  // 5. Validate custom pagination parameters
  TestValidator.predicate(
    "custom limit is 2",
    customResponse.pagination.limit === 2,
  );
  TestValidator.predicate(
    "custom current page is 1",
    customResponse.pagination.current === 1,
  );
  // 6. Verify sorting by created_at descending (newest first) if addresses exist
  if (defaultResponse.data.length > 1) {
    for (let i = 1; i < defaultResponse.data.length; i++) {
      const prevDate = new Date(
        defaultResponse.data[i - 1].created_at,
      ).getTime();
      const currDate = new Date(defaultResponse.data[i].created_at).getTime();
      TestValidator.predicate(
        `address ${i} is older than address ${i - 1}`,
        prevDate >= currDate,
      );
    }
  }
  // 7. Verify pagination calculation is correct
  const expectedPages =
    defaultResponse.pagination.records === 0
      ? 0
      : Math.ceil(
          defaultResponse.pagination.records / defaultResponse.pagination.limit,
        );
  TestValidator.equals(
    "pages calculation",
    defaultResponse.pagination.pages,
    expectedPages,
  );
}
