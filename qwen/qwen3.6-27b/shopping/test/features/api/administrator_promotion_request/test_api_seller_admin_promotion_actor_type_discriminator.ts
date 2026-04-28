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
 * Test seller actor type discriminator in administrator promotion requests.
 *
 * Validates that the actor_type field in the promotion request body correctly matches the authenticated seller's account identity. A seller submits an administrator promotion request with actorType set to 'seller', which aligns with the JWT token's seller identity. The system validates this discriminator matches the authenticated user's type before creating the request record.
 *
 * Upon successful creation, the response is verified to contain actor_type of 'seller' and status of 'pending', confirming the business rule that ensures actor_type consistency between the request and the authenticated user's identity. The polymorphic linkage to the seller account is established based on this discriminator value.
 *
 * 1. A new seller account is registered and authenticated.
 * 2. The seller submits an administrator promotion request with actorType 'seller' and a justification reason.
 * 3. Validates the created request has actorType 'seller' matching the authenticated seller identity.
 * 4. Validates the status is 'pending' indicating awaiting super administrator review.
 */
export async function test_api_seller_admin_promotion_actor_type_discriminator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Submit promotion request with actorType matching authenticated seller identity
  const body = {
    actorType:
      "seller" satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.ICreate["actorType"],
    reason: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.ICreate;
  const request =
    await api.functional.ecommercePlatform.seller.administrator_promotion_requests.create(
      sellerConnection,
      { body },
    );
  typia.assert(request);
  // 3. Validate actorType matches authenticated seller identity
  TestValidator.equals(
    "actor type matches authenticated seller identity",
    request.actorType,
    "seller",
  );
  // 4. Validate status is pending (awaiting super admin review)
  TestValidator.equals(
    "new request status is pending",
    request.status,
    "pending",
  );
}
