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
import { generate_random_shopping_mall_member_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_member_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test that a member can successfully retrieve their own pending administrator promotion request.
 *
 * Validates the complete workflow of a member submitting and viewing their own admin promotion request. The test ensures that after registration and request submission, the member can retrieve their pending request with all expected fields in the correct initial state.
 *
 * Special attention is given to verifying that the request status is 'pending', the actor_type correctly identifies the applicant as 'member', and that reviewer-related fields (rejection_note, reviewer) are null since no super administrator has reviewed the request yet.
 *
 * 1. Member registers with email and password credentials.
 * 2. Member submits an administrator promotion request with a reason text.
 * 3. Member retrieves the promotion request using the returned request ID.
 * 4. Validates response fields: actor_type is 'member', status is 'pending', reason matches input, rejection_note is null, reviewer is null, timestamps are present.
 */
export async function test_api_admin_promotion_request_view_own_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Submit administrator promotion request
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const promotionRequest =
    await generate_random_shopping_mall_member_admin_promotion_requests_create(
      memberConnection,
      {
        body: {
          reason: reason,
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 3. Retrieve the promotion request by ID
  const retrievedRequest =
    await api.functional.shoppingMall.member.admin_promotion_requests.at(
      memberConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 4. Validate response fields
  TestValidator.equals(
    "actor_type is member",
    retrievedRequest.actor_type,
    "member",
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals("reason matches input", retrievedRequest.reason, reason);
  TestValidator.equals(
    "rejection_note is null",
    retrievedRequest.rejection_note,
    null,
  );
  TestValidator.equals("reviewer is null", retrievedRequest.reviewer, null);
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedRequest.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedRequest.updated_at !== undefined,
  );
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    promotionRequest.id,
  );
}
