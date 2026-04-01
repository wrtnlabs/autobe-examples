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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_rejection_already_rejected_fails(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup - join and login
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminJoin = await authorize_super_administrator_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  typia.assert(superAdminJoin);
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(superAdminConnection, {
    body: {
      email: superAdminJoin.email,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.ILogin,
  });
  // 2. Customer setup - join and login
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoin = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoin.email,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 3. Customer submits administrator promotion request
  const promotionRequest =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  TestValidator.equals(
    "initial status is pending",
    promotionRequest.status,
    "pending",
  );
  // 4. Super administrator rejects the promotion request (first rejection - should succeed)
  const firstRejection =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.reject(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallAdminPromotionRequest.IReject,
      },
    );
  typia.assert(firstRejection);
  TestValidator.equals(
    "status after first rejection",
    firstRejection.status,
    "rejected",
  );
  TestValidator.predicate(
    "rejection reason is set",
    firstRejection.rejection_reason !== null &&
      firstRejection.rejection_reason !== undefined,
  );
  // 5. Super administrator attempts to reject the same request again (should fail)
  await TestValidator.error(
    "second rejection fails for already rejected request",
    async () => {
      await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.reject(
        superAdminConnection,
        {
          requestId: promotionRequest.id,
          body: {
            reason: "Another rejection reason",
          } satisfies IShoppingMallAdminPromotionRequest.IReject,
        },
      );
    },
  );
  // 6. Verify the original rejection data remains unchanged
  TestValidator.equals(
    "status remains rejected",
    firstRejection.status,
    "rejected",
  );
}
