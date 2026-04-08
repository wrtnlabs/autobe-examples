import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_cancellation_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // ✅ 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123",
    },
  });
  // ✅ 2. Test filtering by 'pending' status
  const pendingRequests =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // Verify all returned items have 'pending' status
  for (const request of pendingRequests.data) {
    TestValidator.equals(
      "pending filter returns only pending requests",
      request.status,
      "pending",
    );
  }
  // ✅ 3. Test filtering by 'approved' status
  const approvedRequests =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedRequests);
  // Verify all returned items have 'approved' status
  for (const request of approvedRequests.data) {
    TestValidator.equals(
      "approved filter returns only approved requests",
      request.status,
      "approved",
    );
  }
  // ✅ 4. Test filtering by 'rejected' status
  const rejectedRequests =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedRequests);
  // Verify all returned items have 'rejected' status
  for (const request of rejectedRequests.data) {
    TestValidator.equals(
      "rejected filter returns only rejected requests",
      request.status,
      "rejected",
    );
  }
}
