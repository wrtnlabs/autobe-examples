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
 * Test that a member can view their own rejected administrator promotion request with rejection details.
 *
 * Validates the complete rejection workflow for administrator promotion requests. The test ensures that members can successfully retrieve their rejected promotion requests and see all relevant details including the rejection reason and reviewer information.
 *
 * The test flow covers: member registration, promotion request submission, super administrator authentication, request rejection with a note, and member retrieval of the rejected request. This validates proper access control and data integrity throughout the rejection process.
 *
 * 1. Member registers with unique email and credentials.
 * 2. Member submits an administrator promotion request with a reason.
 * 3. Super administrator registers and authenticates.
 * 4. Super administrator reviews and rejects the request with a rejection note.
 * 5. Member retrieves their promotion request and validates rejection details.
 */
export async function test_api_admin_promotion_request_view_own_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${memberAuth.token.access}` },
  };
  // 2. Member submits administrator promotion request
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const promotionRequest =
    await generate_random_shopping_mall_member_admin_promotion_requests_create(
      memberConnection,
      {
        body: { reason },
      },
    );
  typia.assert(promotionRequest);
  TestValidator.equals(
    "request status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "request reason matches",
    promotionRequest.reason,
    reason,
  );
  TestValidator.equals(
    "actor type is member",
    promotionRequest.actor_type,
    "member",
  );
  // 3. Register super administrator account
  const superAdminAuth = await authorize_super_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdminAuth);
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${superAdminAuth.token.access}` },
  };
  // 4. Super administrator rejects the promotion request
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
  TestValidator.equals(
    "updated status is rejected",
    updatedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection note matches",
    updatedRequest.rejection_note,
    rejectionNote,
  );
  TestValidator.predicate(
    "reviewer is populated",
    updatedRequest.reviewer !== null && updatedRequest.reviewer !== undefined,
  );
  // 5. Member retrieves their rejected promotion request
  const retrievedRequest =
    await api.functional.shoppingMall.member.admin_promotion_requests.at(
      memberConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // Validate rejection details
  TestValidator.equals(
    "status is rejected",
    retrievedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection note matches super admin's explanation",
    retrievedRequest.rejection_note,
    rejectionNote,
  );
  TestValidator.equals(
    "reason matches original submission",
    retrievedRequest.reason,
    reason,
  );
  TestValidator.equals(
    "actor type is member",
    retrievedRequest.actor_type,
    "member",
  );
  TestValidator.predicate(
    "reviewer object is populated",
    retrievedRequest.reviewer !== null &&
      retrievedRequest.reviewer !== undefined,
  );
  if (retrievedRequest.reviewer) {
    TestValidator.equals(
      "reviewer id matches super admin",
      retrievedRequest.reviewer.id,
      superAdminAuth.id,
    );
    TestValidator.equals(
      "reviewer email matches super admin",
      retrievedRequest.reviewer.email,
      superAdminAuth.email,
    );
  }
}
