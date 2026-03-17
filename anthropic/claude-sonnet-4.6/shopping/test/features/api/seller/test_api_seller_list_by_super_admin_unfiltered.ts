import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_seller_list_by_super_admin_unfiltered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register 3 sellers with distinct emails/shop names
  const sellerEmails: string[] = [];
  for (let i = 0; i < 3; i++) {
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerEmail = typia.random<string & tags.Format<"email">>();
    await authorize_seller_join(sellerConnection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(16),
        shop_name: `TestShop_${RandomGenerator.alphabets(6)}`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    sellerEmails.push(sellerEmail);
  }
  // 3. Primary Test: Unfiltered seller list
  const unfiltered = await api.functional.shoppingMall.superAdmin.sellers.index(
    superAdminConnection,
    {
      body: {} satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(unfiltered);
  // Validate pagination metadata
  TestValidator.predicate(
    "records >= 3 sellers created",
    () => unfiltered.pagination.records >= 3,
  );
  TestValidator.predicate("data is array", Array.isArray(unfiltered.data));
  // Confirm all created sellers appear in the result set by email
  for (const email of sellerEmails) {
    TestValidator.predicate(
      `created seller with email ${email} appears in unfiltered list`,
      () => unfiltered.data.some((s) => s.email === email),
    );
  }
  // Verify newly registered sellers have isBanned and isSuspended = false
  for (const email of sellerEmails) {
    const found = unfiltered.data.find((s) => s.email === email);
    if (found !== undefined) {
      TestValidator.equals(
        "isBanned is false for new seller",
        found.isBanned,
        false,
      );
      TestValidator.equals(
        "isSuspended is false for new seller",
        found.isSuspended,
        false,
      );
    }
  }
  // 4. Pagination Validation: page 1, limit 2
  const page1 = await api.functional.shoppingMall.superAdmin.sellers.index(
    superAdminConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.predicate(
    "page1 data <= 2 records",
    () => page1.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination.current === 1",
    () => page1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination.limit === 2",
    () => page1.pagination.limit === 2,
  );
  TestValidator.predicate(
    "pagination.pages equals Math.ceil(records/2)",
    () => page1.pagination.pages === Math.ceil(page1.pagination.records / 2),
  );
  // If more pages exist, call page 2 and verify different records
  if (page1.pagination.pages >= 2) {
    const page2 = await api.functional.shoppingMall.superAdmin.sellers.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
    typia.assert(page2);
    const page1Ids = new Set(page1.data.map((s) => s.id));
    TestValidator.predicate("page 2 records differ from page 1", () =>
      page2.data.every((s) => !page1Ids.has(s.id)),
    );
  }
  // 5. Edge Case: Page beyond total
  const beyondPage = await api.functional.shoppingMall.superAdmin.sellers.index(
    superAdminConnection,
    {
      body: {
        page: 9999,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(beyondPage);
  TestValidator.predicate(
    "data is empty array when page beyond total",
    () => beyondPage.data.length === 0,
  );
  TestValidator.predicate(
    "records reflect actual total even on out-of-range page",
    () => beyondPage.pagination.records >= 3,
  );
}
