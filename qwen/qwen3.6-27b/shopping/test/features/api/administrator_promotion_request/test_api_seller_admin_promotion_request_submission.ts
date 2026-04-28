import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_seller_administrator_promotion_requests_create } from "../../../generate/generate_random_ecommerce_platform_seller_administrator_promotion_requests_create";
import { prepare_random_ecommerce_platform_administrator_promotion_request_of_customer } from "../../../prepare/prepare_random_ecommerce_platform_administrator_promotion_request_of_customer";

/**
 * Test seller submission of an administrator promotion request.
 *
 * Validates the complete workflow where a registered seller applies for platform administrator privileges. After authenticating a new seller account, the test submits a promotion request with the seller's account type and a written justification. The response is validated to ensure the request enters pending status with all initial review fields remaining null, and that the actor type correctly reflects the seller's identity.
 *
 * Special attention is given to verifying that the promotion request is properly initialized with pending status, null review fields, and correct actor type linkage to the authenticated seller account.
 *
 * 1. Register and authenticate a new seller account.
 * 2. Submit an administrator promotion request with actorType 'seller' and a justification reason.
 * 3. Validate the response contains correct initial state: pending status, null review fields, seller actor type, and the provided reason.
 */
export async function test_api_seller_admin_promotion_request_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Prepare and submit the promotion request
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const body = {
    actorType: "seller",
    reason,
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.ICreate;
  const request =
    await generate_random_ecommerce_platform_seller_administrator_promotion_requests_create(
      sellerConnection,
      { body },
    );
  typia.assert(request);
  // 3. Validate response business logic
  TestValidator.equals("actor type is seller", request.actorType, "seller");
  TestValidator.equals("status is pending", request.status, "pending");
  TestValidator.equals("reason matches input", request.reason, reason);
  TestValidator.equals(
    "reviewedByAdmin is null",
    request.reviewedByAdmin,
    null,
  );
  TestValidator.equals(
    "rejectionReason is null",
    request.rejectionReason,
    null,
  );
  TestValidator.equals("reviewedAt is null", request.reviewedAt, null);
  TestValidator.predicate(
    "createdAt is valid date-time",
    request.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    request.updatedAt.length > 0,
  );
}
