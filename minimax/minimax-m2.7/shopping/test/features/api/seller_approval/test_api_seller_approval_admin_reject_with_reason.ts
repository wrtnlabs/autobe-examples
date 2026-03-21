import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_admin_seller_approvals_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_approvals_create";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";

export async function test_api_seller_approval_admin_reject_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registers
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      name: RandomGenerator.name(),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Seller registers (creates pending status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPass123!",
      href: "https://example.com/seller",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Create a seller approval record (ICreate only accepts "approved" or "rejected" status)
  const approval =
    await generate_random_ecommerce_mall_admin_seller_approvals_create(
      adminConnection,
      {
        body: {
          sellerId: seller.id,
          status: "approved",
        } satisfies IEcommerceMallSellerApproval.ICreate,
      },
    );
  typia.assert(approval);
  // 4. Admin rejects the seller with a rejection reason using PUT update endpoint
  const rejectionReason =
    "Incomplete business information. Please provide valid business license.";
  const rejectedApproval =
    await api.functional.ecommerceMall.admin.seller_approvals.update(
      adminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "rejected",
          rejectionReason: rejectionReason,
        } satisfies IEcommerceMallSellerApproval.IUpdate,
      },
    );
  typia.assert(rejectedApproval);
  // 5. Validate the rejection response
  TestValidator.equals(
    "approval status is rejected",
    rejectedApproval.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectedApproval.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "seller information present",
    rejectedApproval.seller !== null,
  );
  TestValidator.equals(
    "seller id matches",
    rejectedApproval.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "seller approval status is rejected",
    rejectedApproval.seller.approval_status,
    "rejected",
  );
}
