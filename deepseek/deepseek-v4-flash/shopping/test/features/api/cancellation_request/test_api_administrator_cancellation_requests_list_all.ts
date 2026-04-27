import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an authenticated administrator can view all cancellation requests across the platform with default pagination.
 *
 * Validates the paginated cancellation request listing endpoint accessible only to administrators. The endpoint returns all cancellation requests across the platform without customer or seller scoping.
 *
 * Pagination parameters (page=1, limit=10) are passed explicitly to verify default pagination behavior. The response includes pagination metadata and an array of cancellation request summaries from potentially multiple sellers and customers.
 *
 * 1. Register a new administrator account via POST /auth/administrator/join and obtain JWT tokens.
 * 2. Call PATCH /administrator/cancellation-requests with page=1 and limit=10.
 * 3. Validate the pagination metadata (current, limit, records, pages).
 * 4. Validate that the data array contains cancellation request summaries with all required fields.
 * 5. If two or more items exist, verify default sort order is created_at descending (newest first).
 */
export async function test_api_administrator_cancellation_requests_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. List all cancellation requests with default pagination
  const page =
    await api.functional.eCommerceMall.administrator.cancellation_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IECommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(page);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination current", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 10);
  TestValidator.predicate("records count valid", page.pagination.records >= 0);
  TestValidator.predicate("pages count valid", page.pagination.pages >= 0);
  // 4. Validate data array
  TestValidator.predicate("data is array", Array.isArray(page.data));
  // 5. Validate sort order - created_at descending (newest first)
  if (page.data.length >= 2) {
    for (let i = 1; i < page.data.length; i++) {
      TestValidator.predicate(
        "sorted by created_at descending",
        new Date(page.data[i - 1].created_at).getTime() >=
          new Date(page.data[i].created_at).getTime(),
      );
    }
  }
}
