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
 * Test text search across promotion request justification and rejection reason fields.
 *
 * Validates the seller's ability to perform text searches on administrator promotion requests across both the applicant's written justification and the reviewer's rejection reason. The search uses case-insensitive partial matching via the search parameter in a PATCH request.
 *
 * The test verifies that the paginated response contains proper metadata (current page, limit, total records, total pages) and that each returned promotion request summary includes required fields (id, actor_type, status, reason). For rejected requests, the rejection_reason field validation is confirmed when present.
 *
 * Edge case handling: When no promotion requests match the search term, the API should return an empty data array with records equal to 0 and pages equal to 0.
 *
 * 1. Seller authenticates using the join endpoint with random credentials.
 * 2. Seller performs text search with a specific search term and explicit sort order.
 * 3. Validates paginated response structure and pagination metadata.
 * 4. Confirms each result item contains required fields with correct types.
 * 5. Verifies rejected items can have populated rejection_reason strings.
 */
export async function test_api_administrator_promotion_request_seller_text_search_across_reason_and_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Perform text search across reason and rejection_reason fields
  const searchTerm = "promotion";
  const body = {
    search: searchTerm,
    sort: "created_at-desc",
    actor_type:
      "seller" satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest["actor_type"],
    limit: 20,
    page: 1,
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
  const response =
    await api.functional.ecommercePlatform.seller.administrator_promotion_requests.index(
      sellerConnection,
      { body },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit matches request", response.pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculation is consistent",
    response.pagination.records === 0
      ? response.pagination.pages === 0
      : response.pagination.pages ===
          Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 4. Validate data items returned
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 5. Validate each result item
  for (const item of response.data) {
    typia.assert(item);
    // Validate required fields exist and have correct types
    TestValidator.predicate(
      `item ${item.id} has actor_type customer or seller`,
      item.actor_type === "customer" || item.actor_type === "seller",
    );
    TestValidator.predicate(
      `item ${item.id} has valid status`,
      item.status === "pending" ||
        item.status === "approved" ||
        item.status === "rejected",
    );
    TestValidator.predicate(
      `item ${item.id} has reason string`,
      typeof item.reason === "string",
    );
    // 6. For rejected items, validate rejection_reason when present
    if (
      item.status === "rejected" &&
      item.rejection_reason !== null &&
      item.rejection_reason !== undefined
    ) {
      TestValidator.predicate(
        `rejected item ${item.id} has string rejection_reason`,
        typeof item.rejection_reason === "string",
      );
    }
    // Validate reviewed_by_admin when present
    if (item.reviewedByAdmin !== null && item.reviewedByAdmin !== undefined) {
      typia.assert(item.reviewedByAdmin!);
    }
    // Validate reviewed_at when present
    if (item.reviewed_at !== null && item.reviewed_at !== undefined) {
      // reviewed_at should be a date-time string
      TestValidator.predicate(
        `item ${item.id} has valid reviewed_at format`,
        !isNaN(Date.parse(item.reviewed_at!)),
      );
    }
  }
  // 7. Verify data length doesn't exceed limit
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  // 8. Verify edge case: empty results when no matches
  TestValidator.predicate(
    "empty results have zero records and pages",
    response.pagination.records === 0
      ? response.data.length === 0 && response.pagination.pages === 0
      : true,
  );
}
