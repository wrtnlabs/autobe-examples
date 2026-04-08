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
 * Test the business rule that prevents modifying a promotion request that has already been decided (approved or rejected).
 *
 * Validates the complete promotion request workflow including member submission, super administrator approval, and the enforcement of the terminal state rule. Ensures that once a promotion request has been decided (approved or rejected), it cannot be updated again, maintaining the integrity of the administrator promotion workflow.
 *
 * Special attention is given to verifying that the system properly rejects update attempts on already-decided requests, preventing conflicting decisions and maintaining audit trail integrity. The test confirms that the original approval decision remains unchanged after a failed update attempt.
 *
 * 1. Super administrator account is created and authenticated.
 * 2. Member account is created and authenticated.
 * 3. Member submits an administrator promotion request with a reason.
 * 4. Super administrator approves the pending request, changing status to 'approved'.
 * 5. Super administrator attempts to update the already-approved request.
 * 6. Validates that the update operation fails with appropriate error.
 */
export async function test_api_admin_promotion_request_already_decided_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create and authenticate member
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
  // 3. Member submits administrator promotion request
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
  TestValidator.equals(
    "initial status is pending",
    promotionRequest.status,
    "pending",
  );
  // 4. Super administrator approves the request
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
  TestValidator.equals(
    "status becomes approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewer is set",
    approvedRequest.reviewer !== null && approvedRequest.reviewer !== undefined,
  );
  // 5. Attempt to update the already-approved request (should fail)
  await TestValidator.error(
    "cannot update already decided request",
    async () => {
      await api.functional.shoppingMall.superAdmin.admin_promotion_requests.update(
        superAdminConnection,
        {
          requestId: promotionRequest.id,
          body: {
            status: "rejected",
            rejection_note: "Trying to change decision",
          } satisfies IShoppingMallAdminPromotionRequest.IUpdate,
        },
      );
    },
  );
}
