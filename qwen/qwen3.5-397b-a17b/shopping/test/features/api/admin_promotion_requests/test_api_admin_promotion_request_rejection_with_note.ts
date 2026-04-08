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
 * Test the rejection workflow for an administrator promotion request submitted by a seller, including the required rejection note.
 *
 * Validates the complete rejection flow including seller account creation, promotion request submission, super administrator authentication, and request rejection with explanatory feedback. Ensures that the rejection note is properly stored and returned, the reviewer information is correctly populated, and the status transitions from 'pending' to 'rejected'.
 *
 * Special attention is given to verifying that the rejection note is preserved in the response, the reviewer field contains the super administrator's summary information, and the updated_at timestamp is refreshed after the rejection decision.
 *
 * 1. Seller registers and authenticates to obtain valid session.
 * 2. Seller submits administrator promotion request with reason text.
 * 3. Super administrator registers and authenticates to obtain valid session.
 * 4. Super administrator updates the request with status='rejected' and rejection_note.
 * 5. Validates response contains updated promotion request with status='rejected'.
 * 6. Validates rejection_note is preserved and matches input.
 * 7. Validates reviewer field is populated with super administrator information.
 * 8. Validates updated_at timestamp is refreshed after the update.
 */
export async function test_api_admin_promotion_request_rejection_with_note(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Seller submits administrator promotion request
  const promotionRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(promotionRequest);
  // Verify initial state
  TestValidator.equals(
    "initial status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "rejection_note is null initially",
    promotionRequest.rejection_note === null ||
      promotionRequest.rejection_note === undefined,
  );
  TestValidator.predicate(
    "reviewer is null initially",
    promotionRequest.reviewer === null ||
      promotionRequest.reviewer === undefined,
  );
  // 3. Super administrator registration and authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 4. Super administrator rejects the promotion request with note
  const rejectionNote = RandomGenerator.paragraph({ sentences: 2 });
  const updatedRequest =
    await api.functional.shoppingMall.superAdmin.admin_promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "rejected",
          rejection_note: rejectionNote,
        } satisfies IShoppingMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Validate status transition
  TestValidator.equals(
    "status changed to rejected",
    updatedRequest.status,
    "rejected",
  );
  // 6. Validate rejection note is preserved
  TestValidator.equals(
    "rejection_note matches input",
    updatedRequest.rejection_note,
    rejectionNote,
  );
  // 7. Validate reviewer is populated with super admin information
  TestValidator.predicate(
    "reviewer is populated",
    updatedRequest.reviewer !== null && updatedRequest.reviewer !== undefined,
  );
  TestValidator.equals(
    "reviewer id matches super admin",
    updatedRequest.reviewer!.id,
    superAdminAuth.id,
  );
  TestValidator.equals(
    "reviewer email matches super admin",
    updatedRequest.reviewer!.email,
    superAdminAuth.email,
  );
  // 8. Validate updated_at timestamp is refreshed
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedRequest.updated_at).getTime() >
      new Date(updatedRequest.created_at).getTime(),
  );
  TestValidator.predicate(
    "updated_at is after original updated_at",
    new Date(updatedRequest.updated_at).getTime() >=
      new Date(promotionRequest.updated_at).getTime(),
  );
}
