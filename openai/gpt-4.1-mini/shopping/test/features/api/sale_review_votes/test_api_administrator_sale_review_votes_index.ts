import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleReviewVote";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sale_review_votes_index(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve sale review votes with no filter (default pagination)
  // Authenticate as administrator by joining
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Update adminConnection headers with access token
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // Call the endpoint with empty filter
  const responseAll =
    await api.functional.shoppingMall.administrator.sale_review_votes.index(
      adminConnection,
      { body: {} satisfies IShoppingMallSaleReviewVote.IRequest },
    );
  typia.assert(responseAll);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    responseAll.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    responseAll.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    responseAll.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    responseAll.pagination.pages >= 0,
  );
  if (responseAll.pagination.records !== 0) {
    TestValidator.predicate(
      "pagination pages is at least 1 when records > 0",
      responseAll.pagination.pages >= 1,
    );
  } else {
    TestValidator.equals(
      "pagination pages is 0 when records = 0",
      responseAll.pagination.pages,
      0,
    );
  }
  // Validate data array (no property access due to type definitions)
  for (const vote of responseAll.data) {
    typia.assert(vote);
  }
  // Scenario 2: Retrieve sale review votes with no filters (repeat call)
  const responseFiltered =
    await api.functional.shoppingMall.administrator.sale_review_votes.index(
      adminConnection,
      { body: {} satisfies IShoppingMallSaleReviewVote.IRequest },
    );
  typia.assert(responseFiltered);
  // Validate pagination metadata again
  TestValidator.predicate(
    "filtered pagination current page is at least 1",
    responseFiltered.pagination.current >= 1,
  );
  TestValidator.predicate(
    "filtered pagination limit is non-negative",
    responseFiltered.pagination.limit >= 0,
  );
  // Validate data array
  for (const vote of responseFiltered.data) {
    typia.assert(vote);
  }
  // Scenario 3: Retrieve sale review votes with no matching filters
  // Since request DTO is empty, pass empty body
  const responseEmpty =
    await api.functional.shoppingMall.administrator.sale_review_votes.index(
      adminConnection,
      { body: {} satisfies IShoppingMallSaleReviewVote.IRequest },
    );
  typia.assert(responseEmpty);
  // Validate pagination metadata
  TestValidator.predicate(
    "empty scenario pagination current is at least 1",
    responseEmpty.pagination.current >= 1,
  );
  TestValidator.predicate(
    "empty scenario pagination limit is non-negative",
    responseEmpty.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "empty scenario pagination records is non-negative",
    responseEmpty.pagination.records >= 0,
  );
  TestValidator.predicate(
    "empty scenario pagination pages is non-negative",
    responseEmpty.pagination.pages >= 0,
  );
}
