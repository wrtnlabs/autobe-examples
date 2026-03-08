import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_seller_approval_list_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.MinLength<8> &
        tags.MaxLength<128>,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Query seller approvals with pending status filter
  const result: IPageIEcommerceMallSeller.ISummary =
    await api.functional.ecommerceMall.admin.sellers.approvals.index(
      adminConnection,
      {
        body: {
          approval_status: "pending",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSeller.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 20", result.pagination.limit, 20);
  TestValidator.predicate(
    "pages count is at least 0",
    result.pagination.pages >= 0,
  );
  // 4. Validate all returned sellers have pending approval status
  await ArrayUtil.asyncForEach(result.data, async (seller) => {
    TestValidator.equals(
      "approval_status is pending",
      seller.approval_status,
      "pending",
    );
    TestValidator.equals(
      "rejection_reason is null for pending sellers",
      seller.rejection_reason,
      null,
    );
    typia.assert(seller.email satisfies string & tags.Format<"email">);
    TestValidator.predicate("has shop name", seller.shop_name.length > 0);
    TestValidator.predicate(
      "account_status is valid",
      ["active", "suspended", "banned"].includes(seller.account_status),
    );
    typia.assert(seller.created_at satisfies string & tags.Format<"date-time">);
  });
  // 5. Validate sellers are sorted by created_at descending (newest first)
  if (result.data.length > 1) {
    for (let i = 0; i < result.data.length - 1; i++) {
      TestValidator.predicate(
        `seller at index ${i} is newer than or equal to seller at index ${i + 1}`,
        new Date(result.data[i].created_at) >=
          new Date(result.data[i + 1].created_at),
      );
    }
  }
}
