import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_promotion_requests_create";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

/**
 * Test unauthorized access to admin promotion request snapshots.
 * Seller B should not be able to access snapshots of Seller A's promotion request.
 */
export async function test_api_admin_promotion_request_snapshots_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as Seller A via POST /ecommerceMall/auth/seller/join
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: RandomGenerator.alphabets(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Submit registration for Seller A via POST /ecommerceMall/seller/registrations
  await generate_random_ecommerce_mall_seller_registrations_create(
    sellerAConnection,
    {
      body: {
        taxIdentificationNumber: RandomGenerator.alphaNumeric(10),
        businessRegistrationNumber: RandomGenerator.alphaNumeric(10),
        businessName: RandomGenerator.name(),
        businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  // 3. Register as Seller B via POST /ecommerceMall/auth/seller/join (different credentials)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: RandomGenerator.alphabets(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 4. Submit registration for Seller B via POST /ecommerceMall/seller/registrations
  await generate_random_ecommerce_mall_seller_registrations_create(
    sellerBConnection,
    {
      body: {
        taxIdentificationNumber: RandomGenerator.alphaNumeric(10),
        businessRegistrationNumber: RandomGenerator.alphaNumeric(10),
        businessName: RandomGenerator.name(),
        businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  // 5. Seller A creates promotion request via POST /ecommerceMall/seller/admin-promotion-requests
  const promotionRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerAConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(promotionRequest);
  // 6. Seller B tries to retrieve snapshots via PATCH /ecommerceMall/seller/admin-promotion-requests/{SellerAsPromotionRequestId}/snapshots
  // This should fail with access denied
  await TestValidator.error(
    "seller B cannot access seller A's promotion request snapshots",
    async () => {
      await api.functional.ecommerceMall.seller.admin_promotion_requests.snapshots.index(
        sellerBConnection,
        {
          promotionRequestId: promotionRequest.id,
          body: {},
        },
      );
    },
  );
}
