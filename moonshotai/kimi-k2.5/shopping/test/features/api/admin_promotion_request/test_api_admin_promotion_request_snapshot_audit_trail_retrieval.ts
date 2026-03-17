import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_snapshot_audit_trail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin via join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: "https://test.com/join",
        referrer: "https://test.com",
        ip: "127.0.0.1",
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(customer);
  // 3. Submit admin promotion request as customer
  const promotionRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(promotionRequest);
  // Verify initial status is pending
  TestValidator.equals(
    "initial status is pending",
    promotionRequest.status,
    "pending",
  );
  // 4. Review (approve) promotion request as superAdmin to trigger snapshot creation
  const approvedRequest =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.update(
      superAdminConnection,
      {
        promotionRequestId: promotionRequest.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // Verify status changed to approved
  TestValidator.equals(
    "status changed to approved",
    approvedRequest.status,
    "approved",
  );
  // 5. Retrieve snapshots via PATCH endpoint
  const snapshots =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        promotionRequestId: promotionRequest.id,
        body: {} satisfies IEcommerceMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 6. Validate the response contains at least one snapshot showing state transition
  TestValidator.predicate(
    "snapshots data is not empty",
    snapshots.data.length > 0,
  );
  // Find snapshot showing pending -> approved transition
  const stateTransitionSnapshot = snapshots.data.find(
    (s) => s.previousStatus === "pending" && s.newStatus === "approved",
  );
  TestValidator.predicate(
    "snapshot shows pending to approved transition",
    stateTransitionSnapshot !== undefined,
  );
  if (stateTransitionSnapshot) {
    // Verify the snapshot includes newReviewer information with the superAdmin's details
    TestValidator.predicate(
      "newReviewer is present in snapshot",
      stateTransitionSnapshot.newReviewer !== null,
    );
    if (stateTransitionSnapshot.newReviewer) {
      TestValidator.equals(
        "newReviewer id matches superAdmin",
        stateTransitionSnapshot.newReviewer.id,
        superAdmin.id,
      );
    }
    // Ensure the snapshot captures the timestamp of when the review occurred
    TestValidator.predicate(
      "snapshot has createdAt timestamp",
      stateTransitionSnapshot.createdAt !== null &&
        stateTransitionSnapshot.createdAt !== undefined,
    );
  }
}
