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
 * Test customer administrator promotion request listing retrieval with default parameters.
 *
 * Validates the complete listing flow including customer authentication, request retrieval without filters, and response validation.
 * Ensures that the paginated response contains correct metadata structure and data array format.
 *
 * 1. Customer registers with email, password, href, and referrer.
 * 2. Customer retrieves administrator promotion requests listing with no filters.
 * 3. Validates pagination metadata (current, limit, records, pages).
 * 4. Validates response data structure.
 */
export async function test_api_administrator_promotion_request_customer_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
      href: "https://platform.example.com/register",
      referrer: "https://platform.example.com",
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  // 2. Retrieve promotion requests listing with no filters
  const listing =
    await api.functional.ecommercePlatform.customer.administrator_promotion_requests.index(
      customerConnection,
      {
        body: {} satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest,
      },
    );
  typia.assert(listing);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page >= 1",
    listing.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit > 0", listing.pagination.limit > 0);
  TestValidator.predicate(
    "pagination records >= 0",
    listing.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    listing.pagination.pages >= 0,
  );
  // 4. Validate data structure
  TestValidator.predicate("data is array", Array.isArray(listing.data));
}
