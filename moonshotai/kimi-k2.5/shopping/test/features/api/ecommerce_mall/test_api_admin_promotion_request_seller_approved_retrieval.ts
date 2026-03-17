import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test that a super administrator can retrieve detailed information about an
 * administrator promotion request that has been reviewed and approved,
 * submitted by a seller.
 */
export async function test_api_admin_promotion_request_seller_approved_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = typia.random<string & tags.Format<"password">>();
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    },
  });
  // 2. Create a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password"> & tags.MinLength<8>>();
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // 3. Submit admin promotion request as seller
  const promotionRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason:
            "I have extensive e-commerce experience and want to help manage the platform",
        },
      },
    );
  typia.assert(promotionRequest);
  // 4. Approve the promotion request as superAdmin
  const approvedRequest =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.update(
      superAdminConnection,
      {
        promotionRequestId: promotionRequest.id,
        body: {
          status: "approved",
          rejectionReason: null,
        } satisfies IEcommerceMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Retrieve the reviewed promotion request
  const retrievedRequest =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.at(
      superAdminConnection,
      {
        promotionRequestId: promotionRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Validate the retrieved request
  TestValidator.equals(
    "status is approved",
    retrievedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "reason matches",
    retrievedRequest.reason,
    promotionRequest.reason,
  );
  TestValidator.equals(
    "rejectionReason is null",
    retrievedRequest.rejectionReason,
    null,
  );
  TestValidator.equals("id matches", retrievedRequest.id, promotionRequest.id);
  // Validate reviewer information
  TestValidator.predicate(
    "reviewer is not null",
    retrievedRequest.reviewer !== null,
  );
  TestValidator.predicate(
    "reviewer has id",
    retrievedRequest.reviewer?.id !== undefined,
  );
  TestValidator.predicate(
    "reviewer has email",
    retrievedRequest.reviewer?.email !== undefined,
  );
  // Validate requester information (polymorphic - should be seller)
  TestValidator.predicate(
    "requester is not null",
    retrievedRequest.requester !== null,
  );
  TestValidator.predicate(
    "requester has id",
    retrievedRequest.requester.id !== undefined,
  );
  TestValidator.predicate(
    "requester has email",
    retrievedRequest.requester.email !== undefined,
  );
  TestValidator.equals(
    "requester id matches seller",
    retrievedRequest.requester.id,
    sellerAuthorized.id,
  );
  TestValidator.equals(
    "requester email matches seller",
    retrievedRequest.requester.email,
    sellerEmail,
  );
  // Validate timestamp evolution
  TestValidator.predicate(
    "createdAt is defined",
    new Date(retrievedRequest.createdAt).getTime() > 0,
  );
  TestValidator.predicate(
    "updatedAt is defined",
    new Date(retrievedRequest.updatedAt).getTime() > 0,
  );
  TestValidator.predicate(
    "updatedAt is after createdAt",
    new Date(retrievedRequest.updatedAt).getTime() >=
      new Date(retrievedRequest.createdAt).getTime(),
  );
  // Validate soft delete status
  TestValidator.equals("deletedAt is null", retrievedRequest.deletedAt, null);
}