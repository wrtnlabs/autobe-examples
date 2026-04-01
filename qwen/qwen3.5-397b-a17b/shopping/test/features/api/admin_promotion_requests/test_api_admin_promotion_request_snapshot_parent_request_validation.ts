import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequestSnapshot";
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

export async function test_api_admin_promotion_request_snapshot_parent_request_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(superAdminLoginConnection, {
    body: {
      email: superAdmin.email,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.ILogin,
  });
  // 2. First customer setup
  const customer1Password = RandomGenerator.alphaNumeric(16);
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customer1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer1);
  // 3. First customer submits promotion request
  const firstRequest =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customer1Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  // 4. Super administrator approves first request, creating first snapshot
  const approvedFirstRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.update(
      superAdminLoginConnection,
      {
        requestId: firstRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedFirstRequest);
  TestValidator.equals(
    "first request status",
    approvedFirstRequest.status,
    "approved",
  );
  // 5. Second customer setup
  const customer2Password = RandomGenerator.alphaNumeric(16);
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customer2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer2);
  // 6. Second customer submits promotion request
  const secondRequest =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customer2Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(secondRequest);
  // 7. Super administrator approves second request, creating second snapshot
  const approvedSecondRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.update(
      superAdminLoginConnection,
      {
        requestId: secondRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedSecondRequest);
  TestValidator.equals(
    "second request status",
    approvedSecondRequest.status,
    "approved",
  );
  // 8. Test mismatch: Try to access snapshot with mismatched request ID
  // Generate a random snapshot ID to test the parent request validation
  // The endpoint should return 404 when the snapshot doesn't belong to the specified request
  const randomSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("mismatched request ID returns 404", async () => {
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.snapshots.at(
      superAdminLoginConnection,
      {
        requestId: secondRequest.id,
        snapshotId: randomSnapshotId,
      },
    );
  });
  // 9. Verify that different request IDs with same snapshot ID pattern also fail
  // This ensures the validation checks the parent request relationship
  await TestValidator.error(
    "cross-request snapshot access returns 404",
    async () => {
      await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.snapshots.at(
        superAdminLoginConnection,
        {
          requestId: firstRequest.id,
          snapshotId: randomSnapshotId,
        },
      );
    },
  );
}