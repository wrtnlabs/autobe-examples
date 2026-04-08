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
 * Test retrieving admin promotion request when a pending request exists.
 *
 * After member registration, submit an admin promotion request with a reason text. Then call the endpoint to retrieve the request. Validate the response contains the request details with status 'pending', the submitted reason, and null rejection_note. This validates the happy path for members awaiting super administrator review.
 *
 * 1. Register a new member account with unique email and credentials.
 * 2. Create member-specific connection with authentication token.
 * 3. Submit an admin promotion request with a reason text explaining why the member wants administrator privileges.
 * 4. Retrieve the pending promotion request using the mine.at endpoint.
 * 5. Validate the response contains correct status 'pending', the submitted reason, and null rejection_note.
 * 6. Validate all response fields using typia.assert() for complete type validation.
 */
export async function test_api_admin_promotion_request_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
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
  // 2. Create member-specific connection with auth token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };
  // 3. Submit an admin promotion request
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
  // 4. Retrieve the pending promotion request
  const retrievedRequest =
    await api.functional.shoppingMall.member.admin_promotion_requests.mine.at(
      memberConnection,
    );
  typia.assert(retrievedRequest);
  // 5. Validate the response
  TestValidator.equals(
    "request id matches",
    retrievedRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "reason matches submitted",
    retrievedRequest.reason,
    reason,
  );
  TestValidator.predicate(
    "rejection_note is null or undefined for pending",
    retrievedRequest.rejection_note === null ||
      retrievedRequest.rejection_note === undefined,
  );
  TestValidator.equals(
    "actor_type is member",
    retrievedRequest.actor_type,
    "member",
  );
  TestValidator.predicate(
    "reviewer is null or undefined for pending request",
    retrievedRequest.reviewer === null ||
      retrievedRequest.reviewer === undefined,
  );
}
