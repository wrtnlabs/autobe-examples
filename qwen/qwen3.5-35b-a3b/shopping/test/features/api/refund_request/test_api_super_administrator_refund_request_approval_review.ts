import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_refund_request_approval_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator registration and authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinResult = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        display_name: "Super Admin Tester",
        password: "12345678",
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      },
    },
  );
  typia.assert(superAdminJoinResult);
  typia.assert(superAdminJoinResult.superAdministrator);
  // 2. Call super administrator refund request retrieval
  const refundRequestDetail =
    await api.functional.ecommerceMall.superAdministrator.refund_requests.at(
      superAdminConnection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(refundRequestDetail);
  // 3. Validate response structure for approved refund request
  TestValidator.equals(
    "refund status is approved",
    refundRequestDetail.status,
    "approved",
  );
  TestValidator.equals(
    "approved_by_seller_id exists",
    refundRequestDetail.approved_by_seller_id !== null,
    true,
  );
  TestValidator.equals(
    "rejected_by_seller_id is null for approved request",
    refundRequestDetail.rejected_by_seller_id,
    null,
  );
  // 4. Validate approvedBySeller contains seller details
  TestValidator.equals(
    "approvedBySeller exists",
    refundRequestDetail.approvedBySeller !== null,
    true,
  );
  if (refundRequestDetail.approvedBySeller !== null) {
    typia.assert(refundRequestDetail.approvedBySeller);
    TestValidator.equals(
      "approvedBySeller.id is valid UUID",
      refundRequestDetail.approvedBySeller.id !== undefined,
      true,
    );
    TestValidator.equals(
      "approvedBySeller.display_name exists",
      refundRequestDetail.approvedBySeller.display_name !== "",
      true,
    );
    TestValidator.equals(
      "approvedBySeller.approval_status is approved",
      refundRequestDetail.approvedBySeller.approval_status,
      "approved",
    );
  }
  // 5. Validate rejectedBySeller is null for approved request
  TestValidator.equals(
    "rejectedBySeller is null",
    refundRequestDetail.rejectedBySeller,
    null,
  );
  // 6. Validate order_item reference exists
  typia.assert(refundRequestDetail.order_item);
  TestValidator.equals(
    "order_item.id is valid UUID",
    refundRequestDetail.order_item.id !== undefined,
    true,
  );
  TestValidator.equals(
    "order_item.status is refunded",
    refundRequestDetail.order_item.status,
    "refunded",
  );
}
