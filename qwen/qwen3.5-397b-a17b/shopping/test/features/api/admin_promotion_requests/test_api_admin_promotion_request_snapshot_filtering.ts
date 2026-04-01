import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequestSnapshot";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_promotion_requests_create";
import { generate_random_shopping_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_snapshot_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Store passwords and emails for login
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  // 1. Setup: Register and login super administrator
  const superAdminAuth = await authorize_super_administrator_join(connection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  typia.assert(superAdminAuth);
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.ILogin,
  });
  // 2. Setup: Register customer and submit promotion request
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  const customerRequest =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(customerRequest);
  // 3. Setup: Register seller and submit promotion request
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  const sellerRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(sellerRequest);
  // 4. Approve customer request (creates approved snapshot)
  const approvedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.approve(
      superAdminConnection,
      {
        requestId: customerRequest.id,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "customer request approved",
    approvedRequest.status,
    "approved",
  );
  // 5. Reject seller request (creates rejected snapshot)
  const rejectedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.reject(
      superAdminConnection,
      {
        requestId: sellerRequest.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallAdminPromotionRequest.IReject,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "seller request rejected",
    rejectedRequest.status,
    "rejected",
  );
  // 6. Test filtering by status='approved'
  const approvedSnapshots =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: customerRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  TestValidator.predicate(
    "approved filter returns snapshots",
    approvedSnapshots.data.length > 0,
  );
  approvedSnapshots.data.forEach((snapshot) => {
    TestValidator.equals(
      "all snapshots are approved",
      snapshot.status,
      "approved",
    );
  });
  // 7. Test filtering by status='rejected'
  const rejectedSnapshots =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: sellerRequest.id,
        body: {
          status: "rejected",
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  TestValidator.predicate(
    "rejected filter returns snapshots",
    rejectedSnapshots.data.length > 0,
  );
  rejectedSnapshots.data.forEach((snapshot) => {
    TestValidator.equals(
      "all snapshots are rejected",
      snapshot.status,
      "rejected",
    );
  });
  // 8. Test filtering by actor_type='customer'
  const customerSnapshots =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: customerRequest.id,
        body: {
          actor_type: "customer",
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(customerSnapshots);
  TestValidator.predicate(
    "customer filter returns snapshots",
    customerSnapshots.data.length > 0,
  );
  customerSnapshots.data.forEach((snapshot) => {
    TestValidator.equals(
      "all snapshots are from customer",
      snapshot.actorType,
      "customer",
    );
  });
  // 9. Test filtering by actor_type='seller'
  const sellerSnapshots =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: sellerRequest.id,
        body: {
          actor_type: "seller",
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(sellerSnapshots);
  TestValidator.predicate(
    "seller filter returns snapshots",
    sellerSnapshots.data.length > 0,
  );
  sellerSnapshots.data.forEach((snapshot) => {
    TestValidator.equals(
      "all snapshots are from seller",
      snapshot.actorType,
      "seller",
    );
  });
  // 10. Test date range filtering
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeSnapshots =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: customerRequest.id,
        body: {
          created_at_from: new Date(
            now.getTime() - 60 * 60 * 1000,
          ).toISOString(),
          created_at_to: tomorrow.toISOString(),
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeSnapshots);
  // 11. Test sorting by created_at ascending
  const sortedAscSnapshots =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: customerRequest.id,
        body: {
          sort: "created_at",
          direction: "asc",
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(sortedAscSnapshots);
  if (sortedAscSnapshots.data.length > 1) {
    for (let i = 1; i < sortedAscSnapshots.data.length; i++) {
      TestValidator.predicate(
        "ascending order",
        sortedAscSnapshots.data[i].createdAt >=
          sortedAscSnapshots.data[i - 1].createdAt,
      );
    }
  }
  // 12. Test sorting by created_at descending
  const sortedDescSnapshots =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: customerRequest.id,
        body: {
          sort: "created_at",
          direction: "desc",
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(sortedDescSnapshots);
  if (sortedDescSnapshots.data.length > 1) {
    for (let i = 1; i < sortedDescSnapshots.data.length; i++) {
      TestValidator.predicate(
        "descending order",
        sortedDescSnapshots.data[i].createdAt <=
          sortedDescSnapshots.data[i - 1].createdAt,
      );
    }
  }
  // 13. Test pagination
  const page1 =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: customerRequest.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 1);
  // 14. Test empty results with non-matching filter
  const emptyResults =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: customerRequest.id,
        body: {
          status: "pending",
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals(
    "no pending snapshots for approved request",
    emptyResults.data.length,
    0,
  );
}
