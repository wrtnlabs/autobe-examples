import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_review_search_by_product_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(authorized);
  // 2. Generate random product ID and pagination parameters
  const productId = typia.random<string & tags.Format<"uuid">>();
  const page = typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>();
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  // 3. Search reviews by product with pagination
  const result: IPageIECommerceMallReview.ISummary =
    await api.functional.eCommerceMall.superAdministrator.reviews.index(
      superAdminConnection,
      {
        body: {
          productId: productId,
          page: page,
          limit: limit,
        } satisfies IECommerceMallReview.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate pagination metadata structure
  const currentPage = page satisfies number as number;
  const limitValue = limit satisfies number as number;
  TestValidator.equals(
    "pagination current",
    result.pagination.current,
    currentPage,
  );
  TestValidator.equals("pagination limit", result.pagination.limit, limitValue);
  TestValidator.predicate(
    "total records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 5. Validate each review belongs to the specified product
  for (const review of result.data) {
    TestValidator.equals("review product id", review.product.id, productId);
  }
  // 6. Validate reviews sorted by created_at descending (newest first)
  for (let i = 1; i < result.data.length; i++) {
    TestValidator.predicate(
      "reviews sorted newest first by created_at",
      result.data[i - 1].created_at >= result.data[i].created_at,
    );
  }
}
