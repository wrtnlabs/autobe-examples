import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_seller_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection for authentication isolation
  const sellerConnection: api.IConnection = { host: connection.host };
  // Authenticate as seller using utility function
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Create admin promotion request with valid reason explaining qualifications
  const reason =
    "As an active seller with 50+ transactions, I understand the platform needs and can contribute as an admin";
  const promotionRequest =
    await api.functional.ecommerceMall.customer.admin_promotion_requests.create(
      sellerConnection,
      {
        body: {
          reason,
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  // Validate complete response structure
  typia.assert(promotionRequest);
  // Validate business rules - new request should have pending status
  TestValidator.equals("status is pending", promotionRequest.status, "pending");
  // Validate reason matches the submitted input
  TestValidator.equals("reason matches input", promotionRequest.reason, reason);
  // Validate null fields for newly created pending request
  TestValidator.equals(
    "rejectionReason is null",
    promotionRequest.rejectionReason,
    null,
  );
  TestValidator.equals("reviewer is null", promotionRequest.reviewer, null);
  TestValidator.equals("deletedAt is null", promotionRequest.deletedAt, null);
  // Validate requester is the authenticated seller via polymorphic relationship
  TestValidator.equals(
    "requester id matches seller",
    promotionRequest.requester.id,
    seller.id,
  );
  TestValidator.equals(
    "requester email matches seller",
    promotionRequest.requester.email,
    seller.email,
  );
}
