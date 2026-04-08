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
 * Test retrieving admin promotion request after it has been rejected by a super administrator.
 *
 * Validates the complete rejection workflow including member registration, promotion request submission, super administrator review and rejection, and member retrieval of the rejected request. Ensures that the rejection status and feedback are properly communicated to the applicant.
 *
 * Special attention is given to verifying that the rejection_note is preserved and visible to the member, and that the status correctly reflects the rejection decision.
 *
 * 1. Member registers with email and credentials.
 * 2. Member submits an admin promotion request with a reason.
 * 3. Super administrator registers and logs in.
 * 4. Super administrator reviews and rejects the request with a rejection note.
 * 5. Member retrieves their promotion request and validates status is 'rejected' with the rejection_note.
 */
export async function test_api_admin_promotion_request_retrieve_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
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
  // 2. Submit admin promotion request
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const promotionRequest =
    await generate_random_shopping_mall_member_admin_promotion_requests_create(
      memberConnection,
      {
        body: { reason },
      },
    );
  typia.assert(promotionRequest);
  TestValidator.equals("initial status", promotionRequest.status, "pending");
  TestValidator.equals("reason matches", promotionRequest.reason, reason);
  // 3. Super administrator registration and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
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
    "status after rejection",
    updatedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection note matches",
    updatedRequest.rejection_note,
    rejectionNote,
  );
  // 5. Member retrieves their rejected promotion request
  const retrievedRequest =
    await api.functional.shoppingMall.member.admin_promotion_requests.mine.at(
      memberConnection,
    );
  typia.assert(retrievedRequest);
  // Validate the retrieved request contains rejection information
  TestValidator.equals("retrieved status", retrievedRequest.status, "rejected");
  TestValidator.equals("retrieved reason", retrievedRequest.reason, reason);
  TestValidator.equals(
    "retrieved rejection note",
    retrievedRequest.rejection_note,
    rejectionNote,
  );
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    promotionRequest.id,
  );
}
