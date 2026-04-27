import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_seller_list_paginated_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(authorized);
  TestValidator.predicate(
    "super admin authorized",
    () => !!superAdminConnection.headers?.Authorization,
  );
  // 2. Call seller list with default (no filters)
  const defaultPage =
    await api.functional.eCommerceMall.superAdministrator.sellers.index(
      superAdminConnection,
      {
        body: {} satisfies IECommerceMallSeller.IRequest,
      },
    );
  typia.assert(defaultPage);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current",
    () => defaultPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    () => defaultPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records",
    () => defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    () => defaultPage.pagination.pages >= 0,
  );
  // 4. Validate data items structure and soft-delete exclusion
  for (const seller of defaultPage.data) {
    typia.assert(seller);
    TestValidator.predicate(
      "seller has id",
      () => typeof seller.id === "string" && seller.id.length > 0,
    );
    TestValidator.predicate(
      "seller has email",
      () => typeof seller.email === "string" && seller.email.length > 0,
    );
    TestValidator.predicate(
      "seller has approval_status",
      () => typeof seller.approval_status === "string",
    );
    TestValidator.predicate(
      "seller has profile with shop_name",
      () => typeof seller.profile.shop_name === "string",
    );
    TestValidator.predicate(
      "seller has created_at",
      () => typeof seller.created_at === "string",
    );
    TestValidator.predicate(
      "seller is not soft-deleted",
      () => seller.deleted_at === null,
    );
  }
  // 5. Validate default sort order (newest first - created_at descending)
  for (let i = 1; i < defaultPage.data.length; i++) {
    TestValidator.predicate(
      `seller at index ${i - 1} is newer or same as index ${i}`,
      () =>
        defaultPage.data[i - 1].created_at >= defaultPage.data[i].created_at,
    );
  }
  // 6. Test pagination with specific page and limit
  const paginatedPage =
    await api.functional.eCommerceMall.superAdministrator.sellers.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IECommerceMallSeller.IRequest,
      },
    );
  typia.assert(paginatedPage);
  TestValidator.equals(
    "pagination current is 1",
    paginatedPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 5",
    paginatedPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    () => paginatedPage.data.length <= 5,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    () =>
      paginatedPage.pagination.pages ===
      Math.ceil(
        paginatedPage.pagination.records / paginatedPage.pagination.limit,
      ),
  );
}
