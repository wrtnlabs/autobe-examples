import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator retrieval of paginated customer shipping addresses.
 *
 * Validates the complete workflow for administrators to query customer addresses including authentication, API response structure validation, pagination metadata verification, and address data completeness. Ensures that the endpoint returns properly formatted pagination information and complete shipping address details.
 *
 * Special attention is given to verifying pagination metadata accuracy including current page, limit, total records count, and total pages calculation. Each address record is validated for complete shipping information including recipient name, phone, street address, city, state/province, postal code, country, and default status flag.
 *
 * 1. Administrator account created and authenticated via join endpoint.
 * 2. Query customer addresses with generated customer ID and pagination parameters.
 * 3. Validate response structure matches IPageIShoppingMallCustomerAddress.ISummary.
 * 4. Verify pagination metadata contains valid current page, limit, records, and pages values.
 * 5. Validate each address contains all required shipping fields with correct types.
 * 6. Confirm addresses are sorted by created_at descending (newest first) by default.
 */
export async function test_api_customer_address_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Query customer addresses with pagination
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const page = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
  >();
  const response =
    await api.functional.shoppingMall.admin.customers.addresses.index(
      adminConnection,
      {
        customerId,
        body: {
          page,
          limit,
          sort: "created_at:desc",
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata business rules
  TestValidator.predicate(
    "current page is valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", response.pagination.limit >= 1);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.equals(
    "current page matches request",
    response.pagination.current,
    page,
  );
  TestValidator.equals(
    "limit matches request",
    response.pagination.limit,
    limit,
  );
  // 4. Validate pages calculation
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages calculation correct",
    response.pagination.pages,
    expectedPages,
  );
  // 5. Validate address data array
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 6. Validate each address with typia (complete type validation)
  for (const address of response.data) {
    typia.assert(address);
  }
  // 7. Validate sorting order (newest first) when multiple addresses exist
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentDate = new Date(response.data[i].created_at).getTime();
      const nextDate = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `address ${i} is newer than address ${i + 1}`,
        currentDate >= nextDate,
      );
    }
  }
}
