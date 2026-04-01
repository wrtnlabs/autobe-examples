import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Seller submits administrator promotion request with valid reason
  const promotionRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(promotionRequest);
  // Validate initial request state
  TestValidator.equals(
    "initial status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "actor type is seller",
    promotionRequest.actor_type,
    "seller",
  );
  TestValidator.predicate(
    "reason is non-empty",
    promotionRequest.reason.length > 0,
  );
  TestValidator.equals(
    "rejection reason is initially null",
    promotionRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "request not soft deleted initially",
    promotionRequest.deleted_at,
    null,
  );
  // 4. Super administrator rejects the promotion request with reason
  const rejectionReason = "Insufficient administrative experience";
  const updatedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IShoppingMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Validate rejection response
  TestValidator.equals(
    "status changed to rejected",
    updatedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    updatedRequest.rejection_reason,
    rejectionReason,
  );
  TestValidator.equals(
    "actor type unchanged",
    updatedRequest.actor_type,
    promotionRequest.actor_type,
  );
  TestValidator.equals(
    "original reason unchanged (immutable)",
    updatedRequest.reason,
    promotionRequest.reason,
  );
  TestValidator.notEquals(
    "updated_at changed after rejection",
    updatedRequest.updated_at,
    promotionRequest.updated_at,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    new Date(updatedRequest.updated_at).getTime() > 0,
  );
  TestValidator.equals(
    "request not soft deleted after rejection",
    updatedRequest.deleted_at,
    null,
  );
  // 6. Validate submitter information preserved (seller type)
  const sellerSubmitter =
    updatedRequest.submitter as IShoppingMallSeller.ISummary;
  TestValidator.equals(
    "submitter ID matches seller",
    sellerSubmitter.id,
    sellerAuth.id,
  );
  TestValidator.predicate(
    "submitter has approval_status (seller type)",
    sellerSubmitter.approval_status !== undefined,
  );
}
