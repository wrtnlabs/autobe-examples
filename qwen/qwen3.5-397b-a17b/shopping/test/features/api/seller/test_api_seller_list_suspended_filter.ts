import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_list_suspended_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Request sellers filtered by suspended status (true only)
  const response: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(adminConnection, {
      body: {
        suspended: true,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(response);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate("limit is 20", response.pagination.limit === 20);
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 4. Verify all returned sellers have suspended === true
  for (const seller of response.data) {
    TestValidator.equals(
      "seller suspended status is true",
      seller.suspended,
      true,
    );
    TestValidator.predicate("seller has valid id", seller.id !== undefined);
    TestValidator.predicate(
      "seller has valid email",
      seller.email !== undefined,
    );
    TestValidator.predicate(
      "seller has shop name",
      seller.shop_name !== undefined,
    );
    TestValidator.predicate(
      "approval status is valid",
      seller.approval_status === "PENDING" ||
        seller.approval_status === "APPROVED" ||
        seller.approval_status === "REJECTED",
    );
    // 5. Verify approvedByAdmin field structure when present
    if (seller.approvedByAdmin !== null) {
      TestValidator.predicate(
        "approvedByAdmin has id",
        seller.approvedByAdmin.id !== undefined,
      );
      TestValidator.predicate(
        "approvedByAdmin has email",
        seller.approvedByAdmin.email !== undefined,
      );
      TestValidator.predicate(
        "approvedByAdmin has grade",
        seller.approvedByAdmin.grade !== undefined,
      );
    }
  }
}
