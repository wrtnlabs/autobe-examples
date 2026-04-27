import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_seller_paginated_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Fetch paginated seller listing
  const page: IPageIECommerceMallSeller.ISummary =
    await api.functional.eCommerceMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IECommerceMallSeller.IRequest,
      },
    );
  typia.assert(page);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination current", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  // 4. Validate each seller summary structure
  for (const seller of page.data) {
    typia.assert(seller);
    TestValidator.predicate("seller has valid id", seller.id !== undefined);
    TestValidator.predicate(
      "seller has valid email",
      seller.email !== undefined,
    );
    TestValidator.predicate(
      "seller has approval status",
      seller.approval_status !== undefined,
    );
    TestValidator.predicate(
      "seller has profile with shop_name",
      seller.profile.shop_name !== undefined,
    );
    TestValidator.predicate(
      "seller has created_at",
      seller.created_at !== undefined,
    );
    // Soft-deleted sellers should be excluded from results
    TestValidator.equals(
      "active seller (not soft-deleted)",
      seller.deleted_at,
      null,
    );
  }
}
