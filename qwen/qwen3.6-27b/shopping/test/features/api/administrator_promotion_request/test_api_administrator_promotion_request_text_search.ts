import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer text search on administrator promotion requests.
 *
 * Validates that a customer can search their administrator promotion requests using partial text queries. The search functionality matches text across both the applicant's justification reason and the reviewer's rejection reason fields.
 *
 * The system returns matching promotion requests wrapped in pagination metadata including current page, limit, total records, and total pages. Even when no requests exist or no matches are found, the response structure remains valid with proper pagination defaults.
 *
 * 1. Customer registers and authenticates on the platform.
 * 2. Customer performs a text search on their promotion requests with a query term.
 * 3. Validates the paginated response structure and pagination metadata.
 * 4. Confirms data array contains valid promotion request summaries.
 */
export async function test_api_administrator_promotion_request_text_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Define search query text
  const searchText = "promotion";
  // 3. Search promotion requests using text search
  const body = {
    search: searchText,
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
  const response =
    await api.functional.ecommercePlatform.customer.administrator_promotion_requests.index(
      customerConnection,
      { body },
    );
  typia.assert(response);
  // 4. Validate pagination metadata structure
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.predicate(
    "limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(response.data));
}
