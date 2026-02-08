import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReview";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_product_review_moderation_list(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of first page of product reviews pending moderation
  {
    const adminConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_administrator_join(adminConnection, {
      body: {},
    });
    typia.assert(authorized);
    adminConnection.headers = {
      ...adminConnection.headers,
      Authorization: `Bearer ${authorized.token.access}`,
    };
    const result =
      await api.functional.shoppingMall.administrator.reviews.moderation.index(
        adminConnection,
      );
    typia.assert(result);
    // Check pagination defaults
    TestValidator.predicate(
      "pagination current page >= 1",
      result.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit >= 0",
      result.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      result.pagination.pages >= 0,
    );
    // No longer validate sorting by created_at descending since property does not exist
  }
  // Scenario 2: Pagination behavior
  {
    const adminConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_administrator_join(adminConnection, {
      body: {},
    });
    typia.assert(authorized);
    adminConnection.headers = {
      ...adminConnection.headers,
      Authorization: `Bearer ${authorized.token.access}`,
    };
    // Pagination params passed as query string? Not accepted by signature, so simulate by invoking index without params
    // The scenario mentions specific page and limit - assumed not supported directly, so test default call
    const result =
      await api.functional.shoppingMall.administrator.reviews.moderation.index(
        adminConnection,
      );
    typia.assert(result);
    TestValidator.predicate(
      "pagination records count consistent",
      result.pagination.records >= result.data.length,
    );
    TestValidator.predicate(
      "pagination total pages non-negative",
      result.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination current page valid",
      result.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit valid",
      result.pagination.limit >= 0,
    );
  }
  // Scenario 3: Unauthorized access
  {
    // Use base connection without token
    await TestValidator.httpError(
      "unauthorized access returns 401",
      401,
      async () => {
        await api.functional.shoppingMall.administrator.reviews.moderation.index(
          connection,
        );
      },
    );
  }
}
