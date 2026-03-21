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
import { generate_random_ecommerce_mall_admin_seller_suspensions_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_suspensions_create";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_suspension_already_suspended(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register an administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Register a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Retrieve pending seller approvals
  const approvals =
    await api.functional.ecommerceMall.admin.seller_approvals.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvals);
  // Find the pending approval for our seller
  const pendingApproval = approvals.data.find(
    (approval) => approval.seller.id === seller.id,
  );
  TestValidator.equals("pending approval found", !!pendingApproval, true);
  // 4. Approve the seller
  const approved =
    await api.functional.ecommerceMall.admin.seller_approvals.update(
      adminConnection,
      {
        approvalId: pendingApproval!.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approved);
  TestValidator.equals("seller approved", approved.status, "approved");
  // 5. Suspend the seller for the first time (should succeed)
  const firstSuspension =
    await api.functional.ecommerceMall.admin.seller_suspensions.create(
      adminConnection,
      {
        body: {
          seller_id: seller.id,
          reason: "Policy violation - test suspension",
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(firstSuspension);
  TestValidator.equals("seller matches", firstSuspension.seller.id, seller.id);
  TestValidator.predicate(
    "seller is suspended",
    firstSuspension.restored_at === null,
  );
  // 6. Attempt to suspend the same seller again (should fail with 409 Conflict)
  await TestValidator.httpError("already suspended seller", 409, async () => {
    await api.functional.ecommerceMall.admin.seller_suspensions.create(
      adminConnection,
      {
        body: {
          seller_id: seller.id,
          reason: "Second suspension attempt - should fail",
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  });
}
