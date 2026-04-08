import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_member_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_member_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test the successful approval workflow for an administrator promotion request submitted by a member.
 *
 * Validates the complete approval flow including super administrator authentication, member promotion request submission, and super administrator approval. Ensures that the promotion request status transitions correctly from 'pending' to 'approved' and that the reviewer information is properly populated.
 *
 * Special attention is given to verifying that the reviewer field contains the super administrator's information, the status is updated to 'approved', and no rejection_note is present for approved requests.
 *
 * 1. Super administrator registers and authenticates.
 * 2. Member registers and authenticates.
 * 3. Member submits an administrator promotion request with a valid reason text.
 * 4. Super administrator updates the request with status='approved'.
 * 5. Validates promotion request status is 'approved', reviewer is populated, and rejection_note is absent.
 */
export async function test_api_admin_promotion_request_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup
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
  // 2. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Member submits admin promotion request
  const promotionRequest =
    await generate_random_shopping_mall_member_admin_promotion_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(promotionRequest);
  // Validate initial state
  TestValidator.equals("initial status", promotionRequest.status, "pending");
  TestValidator.equals("actor type", promotionRequest.actor_type, "member");
  TestValidator.predicate(
    "reviewer is null",
    promotionRequest.reviewer === null ||
      promotionRequest.reviewer === undefined,
  );
  TestValidator.predicate(
    "no rejection note",
    promotionRequest.rejection_note === null ||
      promotionRequest.rejection_note === undefined,
  );
  // 4. Super administrator approves the request
  const updatedRequest =
    await api.functional.shoppingMall.superAdmin.admin_promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Validate approval result
  TestValidator.equals("status is approved", updatedRequest.status, "approved");
  TestValidator.equals(
    "requestId matches",
    updatedRequest.id,
    promotionRequest.id,
  );
  TestValidator.predicate(
    "reviewer is populated",
    updatedRequest.reviewer !== null && updatedRequest.reviewer !== undefined,
  );
  TestValidator.predicate(
    "no rejection note for approved",
    updatedRequest.rejection_note === null ||
      updatedRequest.rejection_note === undefined,
  );
  TestValidator.predicate(
    "updated_at is refreshed",
    new Date(updatedRequest.updated_at).getTime() >=
      new Date(promotionRequest.updated_at).getTime(),
  );
  TestValidator.equals(
    "actor type unchanged",
    updatedRequest.actor_type,
    "member",
  );
  TestValidator.equals(
    "reason unchanged",
    updatedRequest.reason,
    promotionRequest.reason,
  );
  // 6. Validate reviewer information
  if (
    updatedRequest.reviewer !== null &&
    updatedRequest.reviewer !== undefined
  ) {
    TestValidator.equals(
      "reviewer id matches super admin",
      updatedRequest.reviewer.id,
      superAdminAuth.id,
    );
    TestValidator.equals(
      "reviewer email matches super admin",
      updatedRequest.reviewer.email,
      superAdminAuth.email,
    );
  }
}
