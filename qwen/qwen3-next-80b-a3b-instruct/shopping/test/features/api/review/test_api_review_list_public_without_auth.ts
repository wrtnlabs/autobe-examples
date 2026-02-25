import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_review_list_public_without_auth(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection object for unauthenticated access
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a request with default pagination parameters (no filters)
  const request: IShoppingMallReview.IRequest = {};
  // Call the endpoint
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(guestConnection, {
      body: request,
    });
  // Validate full structure with typia (covers all schema constraints)
  typia.assert(response);
  // Validate explicit expected default pagination behavior
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  // Business logic: all returned reviews must be non-deleted
  TestValidator.predicate("all reviews are non-deleted", () =>
    response.data.every((review) => review.is_deleted === false),
  );
}
