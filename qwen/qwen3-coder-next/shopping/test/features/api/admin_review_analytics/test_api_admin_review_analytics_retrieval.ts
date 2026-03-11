import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_review_analytics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Call the analytics endpoint with required rating field
  const response =
    await api.functional.ecommerceMall.admin.analytics.reviews.index(
      adminConnection,
      {
        body: {
          rating: 5,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(response);
  // 3. Validate response structure
  TestValidator.equals(
    "response has data array",
    Array.isArray(response.data),
    true,
  );
  TestValidator.equals(
    "response has pagination",
    response.pagination !== null && response.pagination !== undefined,
    true,
  );
  // 4. Verify pagination structure
  TestValidator.equals(
    "current page is number",
    typeof response.pagination.current,
    "number",
  );
  TestValidator.equals(
    "limit is number",
    typeof response.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "records count is number",
    typeof response.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pages count is number",
    typeof response.pagination.pages,
    "number",
  );
  // 5. Validate pagination values
  TestValidator.equals(
    "current page >= 1",
    response.pagination.current >= 1,
    true,
  );
  TestValidator.equals("limit > 0", response.pagination.limit > 0, true);
  TestValidator.equals("records >= 0", response.pagination.records >= 0, true);
  TestValidator.equals("pages >= 0", response.pagination.pages >= 0, true);
  // 6. Validate review summaries in data array
  if (response.data.length > 0) {
    const firstReview = response.data[0];
    // Validate review structure using typia for complete type checking
    typia.assert(firstReview);
    // Validate specific fields mentioned in scenario
    TestValidator.equals("review has id", typeof firstReview.id, "string");
    TestValidator.equals(
      "review has rating",
      typeof firstReview.rating,
      "number",
    );
    TestValidator.equals(
      "rating is 1-5",
      firstReview.rating >= 1 && firstReview.rating <= 5,
      true,
    );
    TestValidator.equals(
      "review has customer object",
      typeof firstReview.customer,
      "object",
    );
    TestValidator.equals(
      "review has product object",
      typeof firstReview.product,
      "object",
    );
    TestValidator.equals(
      "review has created_at string",
      typeof firstReview.created_at,
      "string",
    );
    TestValidator.equals(
      "review has updated_at string",
      typeof firstReview.updated_at,
      "string",
    );
  }
}
