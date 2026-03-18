import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_refund_request_read_admin_success_read_only_fields_consistent(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as admin (POST /shoppingMall/auth/admin/join)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(adminAuth);
  // 2) Obtain an existing refundRequestId.
  const attemptCount = 5;
  let refundRequestId: string | null = null;
  let firstRead: IShoppingMallRefundRequest | null = null;
  let lastError: unknown = undefined;
  for (let i = 0; i < attemptCount; i++) {
    const candidateId = typia.random<string & tags.Format<"uuid">>();
    try {
      const found =
        await api.functional.shoppingMall.admin.admin.refund_requests.at(
          adminConnection,
          { refundRequestId: candidateId },
        );
      typia.assert(found);
      firstRead = found;
      refundRequestId = found.id;
      break;
    } catch (e) {
      lastError = e;
    }
  }
  if (firstRead === null || refundRequestId === null) {
    throw (
      lastError ??
      new Error(
        "Failed to obtain an existing refund request for the read consistency test",
      )
    );
  }
  // 3) Validate payload consistency
  typia.assert(firstRead);
  const {
    id,
    shoppingMallOrderItemId,
    customerReason,
    status,
    sellerComment,
    decisionedAt,
    createdAt,
    updatedAt,
  } = firstRead;
  TestValidator.equals("id matches", id, refundRequestId);
  TestValidator.predicate(
    "updatedAt is on or after createdAt",
    new Date(updatedAt).getTime() >= new Date(createdAt).getTime(),
  );
  // sellerComment/decisionedAt must be paired (both null or both non-null)
  TestValidator.equals(
    "sellerComment nullness matches decisionedAt nullness",
    sellerComment === null,
    decisionedAt === null,
  );
  // 4) Ensure read-only behavior: re-read and ensure decision metadata/status doesn't change
  const secondRead =
    await api.functional.shoppingMall.admin.admin.refund_requests.at(
      adminConnection,
      { refundRequestId },
    );
  typia.assert(secondRead);
  TestValidator.equals("status unchanged", secondRead.status, status);
  TestValidator.equals(
    "sellerComment unchanged",
    secondRead.sellerComment,
    sellerComment,
  );
  TestValidator.equals(
    "decisionedAt unchanged",
    secondRead.decisionedAt,
    decisionedAt,
  );
  TestValidator.equals(
    "shoppingMallOrderItemId unchanged",
    secondRead.shoppingMallOrderItemId,
    shoppingMallOrderItemId,
  );
  TestValidator.equals(
    "customerReason unchanged",
    secondRead.customerReason,
    customerReason,
  );
  TestValidator.equals("createdAt unchanged", secondRead.createdAt, createdAt);
  TestValidator.predicate(
    "updatedAt not earlier than createdAt",
    new Date(secondRead.updatedAt).getTime() >=
      new Date(secondRead.createdAt).getTime(),
  );
}
