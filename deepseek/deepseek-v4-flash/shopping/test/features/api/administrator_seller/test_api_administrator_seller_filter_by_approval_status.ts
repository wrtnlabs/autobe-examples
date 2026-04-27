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

/**
 * Test administrator filtering of seller list by approval status.
 *
 * Validates that an authenticated administrator can filter the seller listing by each approval status value — `pending`, `approved`, and `rejected`. Ensures that the endpoint correctly filters sellers such that all returned records match the requested approval status.
 *
 * The test creates a fresh administrator account using the join utility to obtain authenticated access, then issues three separate filter requests covering all three possible approval statuses. Each response is validated for structural correctness via `typia.assert` and for business-logic correctness by asserting that every seller in the response has the matching `approval_status`.
 *
 * 1. Administrator joins the platform via `authorize_administrator_join`.
 * 2. Filter sellers by `"pending"` — verify all returned sellers have `approval_status === "pending"`.
 * 3. Filter sellers by `"approved"` — verify all returned sellers have `approval_status === "approved"`.
 * 4. Filter sellers by `"rejected"` — verify all returned sellers have `approval_status === "rejected"`.
 */
export async function test_api_administrator_seller_filter_by_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: typia.random<IECommerceMallAdministrator.IJoin>(),
  });
  // 2. Filter by "pending" approval status
  const pendingPage =
    await api.functional.eCommerceMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          approval_status: "pending",
        } satisfies IECommerceMallSeller.IRequest,
      },
    );
  typia.assert(pendingPage);
  for (const seller of pendingPage.data) {
    TestValidator.equals(
      "seller approval status",
      seller.approval_status,
      "pending",
    );
  }
  // 3. Filter by "approved" approval status
  const approvedPage =
    await api.functional.eCommerceMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          approval_status: "approved",
        } satisfies IECommerceMallSeller.IRequest,
      },
    );
  typia.assert(approvedPage);
  for (const seller of approvedPage.data) {
    TestValidator.equals(
      "seller approval status",
      seller.approval_status,
      "approved",
    );
  }
  // 4. Filter by "rejected" approval status
  const rejectedPage =
    await api.functional.eCommerceMall.administrator.sellers.index(
      adminConnection,
      {
        body: {
          approval_status: "rejected",
        } satisfies IECommerceMallSeller.IRequest,
      },
    );
  typia.assert(rejectedPage);
  for (const seller of rejectedPage.data) {
    TestValidator.equals(
      "seller approval status",
      seller.approval_status,
      "rejected",
    );
  }
}
