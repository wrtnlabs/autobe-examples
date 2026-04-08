import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_retrieve_pending_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection with authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuthorized);
  // 2. Create a pending admin promotion request
  const createdRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 3,
            sentenceMax: 5,
            wordMin: 5,
            wordMax: 10,
          }),
        },
      },
    );
  typia.assert(createdRequest);
  // 3. Retrieve the promotion request by its ID
  const retrievedRequest =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.at(
      sellerConnection,
      {
        requestId: createdRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 4. Validate the retrieved request matches expected pending state
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    createdRequest.id,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "reason matches",
    retrievedRequest.reason,
    createdRequest.reason,
  );
  TestValidator.equals(
    "reviewer is null for pending request",
    retrievedRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "rejectionReason is null for pending request",
    retrievedRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "createdAt matches",
    retrievedRequest.createdAt,
    createdRequest.createdAt,
  );
}
