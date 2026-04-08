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

/**
 * Test retrieving admin promotion request when the member has never submitted one.
 *
 * Validates the baseline state for new members who have not initiated the promotion workflow. After member registration, the endpoint should return null indicating no promotion request exists. This ensures the system correctly handles the case where a member queries their promotion request status before ever submitting an application.
 *
 * 1. Register a new member account using authorize_member_join utility function.
 * 2. Create a member-specific connection with the authentication token.
 * 3. Call GET /shoppingMall/member/admin-promotion-requests/mine to retrieve the member's promotion request.
 * 4. Validate that the response is null, confirming no promotion request exists for this member.
 */
export async function test_api_admin_promotion_request_retrieve_not_submitted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and get authentication
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
  // 2. Retrieve promotion request (should be null for new member)
  const promotionRequest =
    await api.functional.shoppingMall.member.admin_promotion_requests.mine.at(
      memberConnection,
    );
  // 3. Validate response is null
  TestValidator.equals(
    "promotion request should be null for new member",
    promotionRequest,
    null,
  );
}
