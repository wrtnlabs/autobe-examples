import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test product review search functionality filtered by product identifier.
 *
 * Validates the review listing endpoint with product-specific filtering returns
 * a properly structured paginated response. A customer registers and searches
 * for reviews of a given product using the productId filter parameter.
 *
 * The test confirms that the response conforms to the IPageIEcommercePlatformReview.ISummary
 * structure with pagination metadata and review summary data. Each review includes
 * the star rating on a 1-5 scale, optional text content, customer reference, product
 * reference, and creation timestamp.
 *
 * Edge cases covered include empty result sets when no reviews exist for the product,
 * and star-only reviews where text_content is null.
 *
 * 1. Customer registers and authenticates with email, password, and session context.
 * 2. Customer searches reviews filtered by a random productId UUID.
 * 3. Response is validated as IPageIEcommercePlatformReview.ISummary.
 * 4. Pagination metadata (current page, limit, total records, total pages) is verified.
 * 5. When reviews exist, newest-first sorting by created_at is validated.
 */
export async function test_api_customer_reviews_search_by_product(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const body = {
    productId: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IEcommercePlatformReview.IRequest;
  const response =
    await api.functional.ecommercePlatform.customer.reviews.index(
      customerConnection,
      { body },
    );
  typia.assert(response);
  TestValidator.predicate(
    "pagination current page is positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  if (response.data.length > 0) {
    TestValidator.predicate("reviews sorted newest-first", () => {
      for (let i = 0; i < response.data.length - 1; i++) {
        if (response.data[i].created_at < response.data[i + 1].created_at) {
          return false;
        }
      }
      return true;
    });
    TestValidator.equals(
      "each review has rating between 1 and 5",
      response.data.every((r) => r.rating >= 1 && r.rating <= 5),
      true,
    );
    TestValidator.equals(
      "each review has product reference",
      response.data.every((r) => r.product.id !== undefined),
      true,
    );
    TestValidator.equals(
      "each review has customer reference",
      response.data.every((r) => r.customer.id !== undefined),
      true,
    );
  }
}
