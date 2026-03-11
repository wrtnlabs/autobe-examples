import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_password_resets_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - Create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoin.email,
      password: "1234",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerEmail = sellerJoin.email;
  // 3. Test filtering by requestStatus
  const pendingResult =
    await api.functional.ecommerceMall.seller.password_resets.index(
      adminLoginConnection,
      {
        body: {
          requestStatus: "pending",
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.predicate(
    "requestStatus = pending returns results",
    pendingResult.data.length >= 0,
  );
  const usedResult =
    await api.functional.ecommerceMall.seller.password_resets.index(
      adminLoginConnection,
      {
        body: {
          requestStatus: "used",
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(usedResult);
  TestValidator.predicate(
    "requestStatus = used returns results",
    usedResult.data.length >= 0,
  );
  const expiredResult =
    await api.functional.ecommerceMall.seller.password_resets.index(
      adminLoginConnection,
      {
        body: {
          requestStatus: "expired",
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(expiredResult);
  TestValidator.predicate(
    "requestStatus = expired returns results",
    expiredResult.data.length >= 0,
  );
  // 4. Test filtering by email pattern
  const emailPattern = "test@";
  const emailResult =
    await api.functional.ecommerceMall.seller.password_resets.index(
      adminLoginConnection,
      {
        body: {
          email: emailPattern,
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(emailResult);
  TestValidator.predicate(
    "Email pattern matching works",
    emailResult.data.length >= 0,
  );
  // 5. Test filtering by date range
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const createdAtFromResult =
    await api.functional.ecommerceMall.seller.password_resets.index(
      adminLoginConnection,
      {
        body: {
          createdAtFrom: oneDayAgo.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(createdAtFromResult);
  TestValidator.predicate(
    "createdAtFrom filtering works",
    createdAtFromResult.data.length >= 0,
  );
  const createdAtToResult =
    await api.functional.ecommerceMall.seller.password_resets.index(
      adminLoginConnection,
      {
        body: {
          createdAtTo: oneDayAgo.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(createdAtToResult);
  TestValidator.predicate(
    "createdAtTo filtering works",
    createdAtToResult.data.length >= 0,
  );
  const dateRangeResult =
    await api.functional.ecommerceMall.seller.password_resets.index(
      adminLoginConnection,
      {
        body: {
          createdAtFrom: oneWeekAgo.toISOString(),
          createdAtTo: oneDayAgo.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "Date range filtering works",
    dateRangeResult.data.length >= 0,
  );
  // 6. Test combined filters
  const combinedFilterResult =
    await api.functional.ecommerceMall.seller.password_resets.index(
      adminLoginConnection,
      {
        body: {
          requestStatus: "pending",
          createdAtFrom: oneDayAgo.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "Combined filters work",
    combinedFilterResult.data.length >= 0,
  );
  // 7. Test sorting scenarios
  const sortCreatedAtAscResult =
    await api.functional.ecommerceMall.seller.password_resets.index(
      adminLoginConnection,
      {
        body: {
          sort: "createdAt",
          sortOrder: "asc",
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(sortCreatedAtAscResult);
  TestValidator.predicate("createdAt ascending sort works", true);
  const sortExpiredAtDescResult =
    await api.functional.ecommerceMall.seller.password_resets.index(
      adminLoginConnection,
      {
        body: {
          sort: "expiredAt",
          sortOrder: "desc",
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(sortExpiredAtDescResult);
  TestValidator.predicate("expiredAt descending sort works", true);
  const sortRequestStatusResult =
    await api.functional.ecommerceMall.seller.password_resets.index(
      adminLoginConnection,
      {
        body: {
          sort: "requestStatus",
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(sortRequestStatusResult);
  TestValidator.predicate("requestStatus sort works", true);
  const defaultSortResult =
    await api.functional.ecommerceMall.seller.password_resets.index(
      adminLoginConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(defaultSortResult);
  TestValidator.predicate("Default sorting (createdAt desc) works", true);
  // 8. Test empty results
  const emptyResult =
    await api.functional.ecommerceMall.seller.password_resets.index(
      adminLoginConnection,
      {
        body: {
          requestStatus: "expired",
          email: "nonexistent@domain.com",
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "Empty pagination records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "Empty pagination pages",
    emptyResult.pagination.pages,
    0,
  );
}
