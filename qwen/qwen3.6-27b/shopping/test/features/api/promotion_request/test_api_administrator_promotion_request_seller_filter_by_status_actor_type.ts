import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller can list administrator promotion requests filtered by lifecycle status and actor type.
 *
 * Authenticates a seller using the registration join endpoint and validates that the seller can query
 * the administrator promotion requests listing with specific filter parameters. The test verifies that
 * filtering by status "pending" and actor_type "customer" returns correctly paginated results where each
 * summary contains the expected structure including UUID identifier, correct discriminator values, reason text,
 * and appropriate nullable review fields.
 *
 * Validates proper pagination metadata including current page position, limit per page, total records
 * matching the filter criteria, and calculated total pages. Ensures the API correctly filters promotion
 * requests by the intersection of status and actor type, returning only records where both conditions are met.
 *
 * 1. Seller authenticates via join endpoint.
 * 2. Seller queries promotion requests with status="pending" and actor_type="customer".
 * 3. Validates pagination metadata structure and record count.
 * 4. Validates each returned summary has correct type constraints and expected values.
 */
export async function test_api_administrator_promotion_request_seller_filter_by_status_actor_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommercePlatformSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(seller);
  // 2. Query filtered promotion requests
  const request = {
    status: "pending",
    actor_type: "customer",
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
  const response: IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer.ISummary =
    await api.functional.ecommercePlatform.seller.administrator_promotion_requests.index(
      sellerConnection,
      { body: request },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current matches default",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    response.pagination.pages >= 0,
  );
  // 4. Validate filtered results have correct structure
  for (const item of response.data) {
    typia.assert(item);
    TestValidator.equals("actor_type is customer", item.actor_type, "customer");
    TestValidator.equals("status is pending", item.status, "pending");
    TestValidator.predicate(
      "reason is non-empty string",
      item.reason.length > 0,
    );
  }
  // 5. Validate data count matches pagination
  TestValidator.predicate(
    "data array length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
}
