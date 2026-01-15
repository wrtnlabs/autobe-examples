import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_seller_pagination(
  connection: api.IConnection,
): Promise<void> {
  const response: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.sellers.index(connection);
  typia.assert(response);
  const pagination = response.pagination;
  TestValidator.equals(
    "pagination 'current' should be 1 (default)",
    pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination 'limit' should be > 0",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination 'records' should be >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination 'pages' should be >= 0",
    pagination.pages >= 0,
  );
  TestValidator.equals(
    "data should be an array",
    Array.isArray(response.data),
    true,
  );
  // Validate the first seller in the response (if any exist)
  if (response.data.length > 0) {
    const seller = response.data[0];
    TestValidator.equals(
      "seller business name should not be empty",
      seller.businessName.length > 0,
      true,
    );
    TestValidator.predicate(
      "seller rating should be between 0 and 5",
      seller.rating >= 0 && seller.rating <= 5,
    );
    TestValidator.predicate(
      "seller sales count should be >= 0",
      seller.salesCount >= 0,
    );
  }
}