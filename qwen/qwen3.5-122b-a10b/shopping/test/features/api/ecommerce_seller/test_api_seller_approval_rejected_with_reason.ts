import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApproval";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_approval_rejected_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Generate a rejected approval record (simulating admin rejection)
  // Since there's no rejection endpoint, we simulate the state with typia.random
  const rejectedApproval: IEcommerceSellerApproval =
    typia.random<IEcommerceSellerApproval>();
  typia.assert(rejectedApproval);
  // 3. Seller retrieves their approval request
  const approval = await api.functional.ecommerce.seller.approvals.at(
    sellerConnection,
    {
      approvalId: rejectedApproval.id,
    },
  );
  typia.assert(approval);
  // 4. Validate business logic - status is rejected
  TestValidator.equals(
    "approval status is rejected",
    approval.status,
    "rejected",
  );
  // 5. Validate rejection reason is present and meaningful
  TestValidator.predicate(
    "rejection reason exists and is not empty",
    approval.rejectionReason !== null &&
      approval.rejectionReason !== undefined &&
      approval.rejectionReason.length > 0,
  );
  // 6. Validate review metadata exists for rejected approval
  TestValidator.predicate(
    "reviewedAt exists for rejected approval",
    approval.reviewedAt !== null && approval.reviewedAt !== undefined,
  );
  TestValidator.predicate(
    "reviewedByAdmin exists for rejected approval",
    approval.reviewedByAdmin !== null && approval.reviewedByAdmin !== undefined,
  );
}
