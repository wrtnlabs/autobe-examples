import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_approval_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller to generate an approval record
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Get current date boundaries for filtering
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
  );
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  // 3. Query approvals with date range including the current date
  const approvalPage =
    await api.functional.ecommerceMall.seller.sellers.me.approvals.index(
      sellerConnection,
      {
        body: {
          created_at_from: todayStart.toISOString() as string &
            tags.Format<"date-time">,
          created_at_to: todayEnd.toISOString() as string &
            tags.Format<"date-time">,
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvalPage);
  // 4. Validate pagination metadata reflects filtered records
  TestValidator.equals("current page is 1", approvalPage.pagination.current, 1);
  TestValidator.equals("limit is 20", approvalPage.pagination.limit, 20);
  TestValidator.predicate("has records", approvalPage.pagination.records >= 1);
  TestValidator.predicate("has pages", approvalPage.pagination.pages >= 1);
  // 5. Validate approval record exists and falls within date range
  TestValidator.predicate("has approval data", approvalPage.data.length > 0);
  const approval = approvalPage.data[0];
  const createdAt = new Date(approval.created_at);
  TestValidator.predicate(
    "approval created_at >= date range start",
    createdAt >= todayStart,
  );
  TestValidator.predicate(
    "approval created_at <= date range end",
    createdAt <= todayEnd,
  );
}
