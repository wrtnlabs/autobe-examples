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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_approval_list_all_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const sellerConnections: api.IConnection[] = [];
  for (let i = 0; i < 3; i++) {
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_join(sellerConnection, {});
    sellerConnections.push(sellerConnection);
  }
  const approvalList =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvalList);
  TestValidator.equals(
    "pagination exists",
    approvalList.pagination !== null,
    true,
  );
  TestValidator.equals(
    "pagination has current page",
    approvalList.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    approvalList.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    approvalList.pagination.records >= 3,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    approvalList.pagination.pages >= 1,
    true,
  );
  TestValidator.equals(
    "default limit is 20",
    approvalList.pagination.limit,
    20,
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(approvalList.data),
    true,
  );
  TestValidator.predicate(
    "has at least 3 approval records",
    approvalList.data.length >= 3,
  );
  for (const approval of approvalList.data) {
    TestValidator.equals(
      "id is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        approval.id,
      ),
      true,
    );
    TestValidator.equals("seller exists", approval.seller !== null, true);
    TestValidator.equals(
      "seller.id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        approval.seller.id,
      ),
      true,
    );
    TestValidator.equals(
      "seller.email exists",
      approval.seller.email !== undefined,
      true,
    );
    TestValidator.equals("status exists", approval.status !== undefined, true);
    TestValidator.equals(
      "created_at is date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(approval.created_at),
      true,
    );
    TestValidator.equals(
      "updated_at is date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(approval.updated_at),
      true,
    );
  }
  for (let i = 1; i < approvalList.data.length; i++) {
    const prev = new Date(approvalList.data[i - 1].created_at);
    const curr = new Date(approvalList.data[i].created_at);
    TestValidator.predicate(
      "record " + i + " sorted correctly",
      prev.getTime() >= curr.getTime(),
    );
  }
}
