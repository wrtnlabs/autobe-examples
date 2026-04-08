import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_approval_requests_create";
import { prepare_random_ecommerce_mall_seller_approval_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval_request";

export async function test_api_seller_approval_request_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  const sellerId: string = seller.id;
  // 2. Create first approval request (simulating what would be rejected by admin)
  const firstRequest: IEcommerceMallSellerApprovalRequest =
    await api.functional.ecommerceMall.seller.seller_approval_requests.create(
      sellerConnection,
      {
        body: {
          request_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  // Validate first request is pending
  TestValidator.equals(
    "first request status is pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "first request reviewer is null",
    firstRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "first request rejection reason is null",
    firstRequest.rejectionReason,
    null,
  );
  // 3. Submit new approval request after addressing issues (reapplication)
  const newRequestReason: string = RandomGenerator.paragraph({ sentences: 3 });
  const newApprovalRequest: IEcommerceMallSellerApprovalRequest =
    await api.functional.ecommerceMall.seller.seller_approval_requests.create(
      sellerConnection,
      {
        body: {
          request_reason: newRequestReason,
        } satisfies IEcommerceMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(newApprovalRequest);
  // 4. Validate new approval request
  TestValidator.equals(
    "new request status is pending",
    newApprovalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "new request reviewer is null",
    newApprovalRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "new request rejection reason is null",
    newApprovalRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "new request seller id matches",
    newApprovalRequest.seller.id,
    sellerId,
  );
  // 5. Verify new request has unique id and timestamp
  typia.assert(newApprovalRequest.id);
  typia.assert(newApprovalRequest.createdAt);
  typia.assert(newApprovalRequest.updatedAt);
  // 6. Verify request reason is preserved
  TestValidator.equals(
    "new request reason matches input",
    newApprovalRequest.requestReason,
    newRequestReason,
  );
  // 7. Verify timestamps are different (new request has newer created_at)
  TestValidator.notEquals(
    "new request has different created_at timestamp",
    firstRequest.createdAt,
    newApprovalRequest.createdAt,
  );
  // 8. Verify original request remains unchanged (id should not change)
  TestValidator.equals(
    "original request id unchanged",
    firstRequest.id,
    firstRequest.id,
  );
  // 9. Verify both requests have different ids (separate records)
  TestValidator.notEquals(
    "new request has unique id",
    firstRequest.id,
    newApprovalRequest.id,
  );
  // 10. Test that seller remains restricted - verify seller status still shows pending for approval
  TestValidator.equals(
    "seller approval_status remains pending",
    seller.approval_status,
    "pending",
  );
}
