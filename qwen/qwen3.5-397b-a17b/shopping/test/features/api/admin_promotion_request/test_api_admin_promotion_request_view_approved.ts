import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test super administrator retrieval of an approved administrator promotion request with complete review details.
 *
 * Validates the complete promotion request approval workflow including seller account creation, promotion request submission, super administrator review and approval, and retrieval of the approved request. Ensures that the approval process correctly records the reviewer information and status transition.
 *
 * Special attention is given to verifying that the reviewer object is properly populated with the super administrator's ID and email after approval, and that the status correctly reflects 'approved' with rejection_note as null.
 *
 * 1. Super administrator account is created and authenticated.
 * 2. Seller account is created and authenticated.
 * 3. Seller submits an administrator promotion request with a reason.
 * 4. Super administrator approves the promotion request.
 * 5. Retrieve the approved promotion request and validate all fields.
 */
export async function test_api_admin_promotion_request_view_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminJoinResult = await authorize_super_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdminJoinResult);
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdminJoinResult.email,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create and authenticate seller
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoinResult);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinResult.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Seller submits administrator promotion request
  const promotionRequest =
    await api.functional.shoppingMall.seller.admin_promotion_requests.create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 4. Super administrator approves the promotion request
  const approvedRequest =
    await api.functional.shoppingMall.superAdmin.admin_promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Retrieve the approved promotion request
  const retrievedRequest =
    await api.functional.shoppingMall.superAdmin.admin_promotion_requests.at(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // Validate the approved request
  TestValidator.equals(
    "status is approved",
    retrievedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "actor_type is seller",
    retrievedRequest.actor_type,
    "seller",
  );
  TestValidator.equals(
    "rejection_note is null",
    retrievedRequest.rejection_note,
    null,
  );
  TestValidator.predicate(
    "reviewer exists",
    retrievedRequest.reviewer !== null &&
      retrievedRequest.reviewer !== undefined,
  );
  TestValidator.equals(
    "reviewer id matches super admin",
    retrievedRequest.reviewer!.id,
    superAdminJoinResult.id,
  );
  TestValidator.equals(
    "reviewer email matches super admin",
    retrievedRequest.reviewer!.email,
    superAdminJoinResult.email,
  );
}
