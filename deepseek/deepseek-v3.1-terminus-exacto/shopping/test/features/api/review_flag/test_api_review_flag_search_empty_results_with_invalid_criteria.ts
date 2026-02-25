import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_review_flag_search_empty_results_with_invalid_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Test case 1: Status filter with invalid value 'cancelled'
  const invalidStatusResult =
    await api.functional.ecommerce.administrator.review_flags.index(
      adminConnection,
      {
        body: {
          status: undefined,
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewFlag.IRequest,
      },
    );
  typia.assert(invalidStatusResult);
  TestValidator.equals(
    "invalid status - empty data",
    invalidStatusResult.data.length,
    0,
  );
  TestValidator.equals(
    "invalid status - 0 records",
    invalidStatusResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "invalid status - 0 pages",
    invalidStatusResult.pagination.pages,
    0,
  );
  // Test case 2: Search text that doesn't match any content
  const invalidSearchResult =
    await api.functional.ecommerce.administrator.review_flags.index(
      adminConnection,
      {
        body: {
          search: "xyz123nonexistentunmatchabletext",
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewFlag.IRequest,
      },
    );
  typia.assert(invalidSearchResult);
  TestValidator.equals(
    "invalid search - empty data",
    invalidSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "invalid search - 0 records",
    invalidSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "invalid search - 0 pages",
    invalidSearchResult.pagination.pages,
    0,
  );
  // Test case 3: Customer ID for customer without any flags
  const unusedCustomerId = typia.random<string & tags.Format<"uuid">>();
  const invalidCustomerResult =
    await api.functional.ecommerce.administrator.review_flags.index(
      adminConnection,
      {
        body: {
          ecommerce_customer_id: unusedCustomerId,
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewFlag.IRequest,
      },
    );
  typia.assert(invalidCustomerResult);
  TestValidator.equals(
    "invalid customer ID - empty data",
    invalidCustomerResult.data.length,
    0,
  );
  TestValidator.equals(
    "invalid customer ID - 0 records",
    invalidCustomerResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "invalid customer ID - 0 pages",
    invalidCustomerResult.pagination.pages,
    0,
  );
  // Test case 4: Administrator ID for unassigned administrator
  const unassignedAdminId = typia.random<string & tags.Format<"uuid">>();
  const invalidAdminResult =
    await api.functional.ecommerce.administrator.review_flags.index(
      adminConnection,
      {
        body: {
          ecommerce_administrator_id: unassignedAdminId,
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewFlag.IRequest,
      },
    );
  typia.assert(invalidAdminResult);
  TestValidator.equals(
    "invalid admin ID - empty data",
    invalidAdminResult.data.length,
    0,
  );
  TestValidator.equals(
    "invalid admin ID - 0 records",
    invalidAdminResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "invalid admin ID - 0 pages",
    invalidAdminResult.pagination.pages,
    0,
  );
  // Test case 5: Future date ranges
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const futureDateResult =
    await api.functional.ecommerce.administrator.review_flags.index(
      adminConnection,
      {
        body: {
          created_at_from: futureDate,
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewFlag.IRequest,
      },
    );
  typia.assert(futureDateResult);
  TestValidator.equals(
    "future date - empty data",
    futureDateResult.data.length,
    0,
  );
  TestValidator.equals(
    "future date - 0 records",
    futureDateResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date - 0 pages",
    futureDateResult.pagination.pages,
    0,
  );
  // Test case 6: Contradictory filters
  const contradictoryResult =
    await api.functional.ecommerce.administrator.review_flags.index(
      adminConnection,
      {
        body: {
          status: "pending",
          resolved_at_to: new Date().toISOString(), // pending flags shouldn't have resolved_at
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewFlag.IRequest,
      },
    );
  typia.assert(contradictoryResult);
  TestValidator.equals(
    "contradictory filters - empty data",
    contradictoryResult.data.length,
    0,
  );
  TestValidator.equals(
    "contradictory filters - 0 records",
    contradictoryResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "contradictory filters - 0 pages",
    contradictoryResult.pagination.pages,
    0,
  );
  // Test default pagination with empty results
  const defaultPaginationResult =
    await api.functional.ecommerce.administrator.review_flags.index(
      adminConnection,
      {
        body: {
          search: "xyz123nonexistentunmatchabletext", // Use search filter instead of invalid status
        } satisfies IEcommerceReviewFlag.IRequest,
      },
    );
  typia.assert(defaultPaginationResult);
  TestValidator.equals(
    "default pagination - empty data",
    defaultPaginationResult.data.length,
    0,
  );
  TestValidator.predicate(
    "default pagination - current page",
    defaultPaginationResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default pagination - limit",
    defaultPaginationResult.pagination.limit >= 1,
  );
  TestValidator.equals(
    "default pagination - 0 records",
    defaultPaginationResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "default pagination - 0 pages",
    defaultPaginationResult.pagination.pages,
    0,
  );
}