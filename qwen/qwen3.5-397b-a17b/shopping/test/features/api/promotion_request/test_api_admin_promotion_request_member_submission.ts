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
 * Test member administrator promotion request submission workflow.
 *
 * Validates the complete promotion request flow including member registration, authentication, and promotion request submission. Ensures that the request is correctly created with pending status, member actor type, and all required fields properly populated.
 *
 * Special attention is given to verifying that the request status is 'pending' indicating it awaits super administrator review, the actor_type is 'member', the reason text is preserved, and rejection_note and reviewer are null for new submissions.
 *
 * 1. Member registers with email and password credentials.
 * 2. Member submits promotion request with reason text.
 * 3. Validates response contains created request with status 'pending', actor_type 'member', provided reason, null rejection_note, null reviewer, and auto-generated timestamps.
 */
export async function test_api_admin_promotion_request_member_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Submit promotion request
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
  // 3. Validate promotion request
  TestValidator.equals("status is pending", promotionRequest.status, "pending");
  TestValidator.equals(
    "actor type is member",
    promotionRequest.actor_type,
    "member",
  );
  TestValidator.equals("reason matches", promotionRequest.reason, reason);
  TestValidator.equals(
    "rejection note is null",
    promotionRequest.rejection_note,
    null,
  );
  TestValidator.equals("reviewer is null", promotionRequest.reviewer, null);
  TestValidator.predicate(
    "has created_at timestamp",
    promotionRequest.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    promotionRequest.updated_at !== undefined,
  );
}
