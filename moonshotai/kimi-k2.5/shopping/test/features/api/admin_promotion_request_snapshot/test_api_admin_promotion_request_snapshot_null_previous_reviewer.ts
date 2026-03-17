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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_snapshot_null_previous_reviewer(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  // Step 2: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Step 3: Submit admin promotion request as seller
  const promotionRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(promotionRequest);
  // Step 4: Approve promotion request as super admin (creates first snapshot)
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
  // Step 5: List snapshots to find the snapshot ID
  const snapshotsPage =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        promotionRequestId: promotionRequest.id,
        body: {} satisfies IEcommerceMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  TestValidator.predicate(
    "snapshots list is not empty",
    snapshotsPage.data.length > 0,
  );
  const snapshotId = snapshotsPage.data[0].id;
  // Step 6: Retrieve specific snapshot (target endpoint)
  const snapshot =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.snapshots.at(
      superAdminConnection,
      {
        promotionRequestId: promotionRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot structure and null previous reviewer (initial review)
  TestValidator.equals(
    "previousReviewer is null",
    snapshot.previousReviewer,
    null,
  );
  TestValidator.equals(
    "previousStatus is pending",
    snapshot.previousStatus,
    "pending",
  );
  TestValidator.equals("newStatus is approved", snapshot.newStatus, "approved");
  TestValidator.predicate(
    "newReviewer is not null",
    snapshot.newReviewer !== null,
  );
  if (snapshot.newReviewer !== null) {
    typia.assert(snapshot.newReviewer);
  }
}
