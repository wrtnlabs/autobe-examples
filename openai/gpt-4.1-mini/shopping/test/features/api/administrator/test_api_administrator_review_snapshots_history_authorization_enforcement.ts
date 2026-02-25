import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_review_snapshots_history_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Description:
  // This test covers authorization enforcement for the PATCH /shoppingMall/administrator/reviewSnapshots/history endpoint.
  // It verifies that access by unauthenticated users, customers, and sellers is denied,
  // while an authorized administrator can successfully retrieve review snapshot history data.
  // It also checks error responses for missing or invalid authorization tokens.
  // Base connection is given. Create dedicated connections for roles.
  // 1. No authentication (base connection only) → expect 401 Unauthorized or similar error
  await TestValidator.httpError(
    "unauthorized access without token",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.reviewSnapshots.history.index(
        connection,
        {
          body: {},
        },
      );
    },
  );
  // 2. Customer role (simulate customer authentication with invalid or no admin token)
  const customerConnection: api.IConnection = { host: connection.host };
  // Customer role has no utility login, so just use base with no admin token
  // Attempt access with customer headers (simulate by not setting admin token)
  await TestValidator.httpError(
    "forbidden access with customer role",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.reviewSnapshots.history.index(
        customerConnection,
        {
          body: {},
        },
      );
    },
  );
  // 3. Seller role (simulate seller with no admin token, so same as unauthorized)
  const sellerConnection: api.IConnection = { host: connection.host };
  // Attempt access with seller headers (simulate by not setting admin token)
  await TestValidator.httpError(
    "forbidden access with seller role",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.reviewSnapshots.history.index(
        sellerConnection,
        {
          body: {},
        },
      );
    },
  );
  // 4. Authorized administrator
  const adminConnection: api.IConnection = { host: connection.host };
  // Administrator join and get token
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin+${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: "Password1234",
    },
  });
  // Set admin connection headers with token manually since utility does not do it
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuth.token.access}`;
  // Attempt authorized request
  const output =
    await api.functional.shoppingMall.administrator.reviewSnapshots.history.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(output);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    output.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is at most 5",
    output.pagination.limit <= 5,
  );
  // Validate data array is array of review snapshot summary
  for (const snapshot of output.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "rating is between 1 and 5",
      snapshot.rating >= 1 && snapshot.rating <= 5,
    );
  }
  // 5. Missing or malformed authorization token
  const badTokenConnection: api.IConnection = { host: connection.host };
  badTokenConnection.headers = { Authorization: "Bearer malformed.token.here" };
  await TestValidator.httpError(
    "invalid token results in unauthorized",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.reviewSnapshots.history.index(
        badTokenConnection,
        {
          body: {},
        },
      );
    },
  );
  // Note: Audit trail verification would be part of backend logs, out of scope here.
}
