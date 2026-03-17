import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
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
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

/**
 * Test seller registration pending review queue workflow.
 * Verifies that super administrator can filter and view pending seller registrations.
 */
export async function test_api_seller_registration_pending_review_queue(
  connection: api.IConnection,
) {
  // 1. Create and authenticate super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  // First create super admin via join (since we need an account to login)
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  // Login as super admin
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IEcommerceMallSuperAdmin.ILogin,
  });
  // 2. Register multiple sellers and submit their registrations
  const sellerCount = 3;
  const registeredSellers: IEcommerceMallSeller.IAuthorized[] = [];
  for (let i = 0; i < sellerCount; i++) {
    // Create seller account
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {});
    typia.assert(seller);
    registeredSellers.push(seller);
    // Submit seller registration application
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  }
  // 3. Super admin retrieves pending review queue filtered by status='pending'
  const pendingQueue: IPageIEcommerceMallSellerRegistration.ISummary =
    await api.functional.ecommerceMall.superAdmin.seller_registrations.index(
      superAdminConnection,
      {
        body: {
          limit: 10,
          cursor: null,
          status: "pending",
          sellerId: null,
          reviewerId: null,
          createdAtFrom: null,
          createdAtTo: null,
          reviewedAtFrom: null,
          reviewedAtTo: null,
          sortBy: null,
          sortOrder: null,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(pendingQueue);
  // 4. Validate pagination and data structure
  TestValidator.predicate(
    "pagination exists",
    pendingQueue.pagination !== null,
  );
  TestValidator.predicate("data exists", pendingQueue.data !== null);
  TestValidator.predicate("data is array", Array.isArray(pendingQueue.data));
  // Validate that pending registrations are returned
  TestValidator.predicate(
    "returns pending registrations",
    pendingQueue.data.every(
      (reg: IEcommerceMallSellerRegistration.ISummary) =>
        reg.status === "pending",
    ),
  );
  // Validate that reviewer is null for pending registrations
  TestValidator.predicate(
    "reviewer is null for pending registrations",
    pendingQueue.data.every(
      (reg: IEcommerceMallSellerRegistration.ISummary) => reg.reviewer === null,
    ),
  );
  // Validate that rejectionReason is null for pending registrations
  TestValidator.predicate(
    "rejection reason is null for pending registrations",
    pendingQueue.data.every(
      (reg: IEcommerceMallSellerRegistration.ISummary) =>
        reg.rejectionReason === null,
    ),
  );
  // Validate seller information is present
  TestValidator.predicate(
    "seller info is present",
    pendingQueue.data.every(
      (reg: IEcommerceMallSellerRegistration.ISummary) =>
        reg.seller !== null &&
        reg.seller.id !== null &&
        reg.seller.email !== null,
    ),
  );
  // Check that our registered sellers appear in the queue
  const sellerIdsInQueue = new Set(
    pendingQueue.data.map(
      (reg: IEcommerceMallSellerRegistration.ISummary) => reg.seller.id,
    ),
  );
  const allSellersFound = registeredSellers.every((seller) =>
    sellerIdsInQueue.has(seller.id),
  );
  TestValidator.predicate(
    "all registered sellers found in queue",
    allSellersFound,
  );
  // 5. Validate timestamps are present
  TestValidator.predicate(
    "createdAt timestamp present",
    pendingQueue.data.every(
      (reg: IEcommerceMallSellerRegistration.ISummary) =>
        reg.createdAt !== null,
    ),
  );
  // Validate pagination structure
  TestValidator.predicate(
    "pagination current is valid",
    pendingQueue.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    pendingQueue.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    pendingQueue.pagination.records >= sellerCount,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    pendingQueue.pagination.pages >= 1,
  );
}
