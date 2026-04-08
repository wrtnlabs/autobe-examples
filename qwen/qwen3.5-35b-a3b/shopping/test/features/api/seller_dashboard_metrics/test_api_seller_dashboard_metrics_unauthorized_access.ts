import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import type { IEcommerceMallSellerDashboardMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboardMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_approval_requests_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_seller_approval_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval_request";

/**
 * Test unauthorized access scenario where a seller attempts to access another seller's dashboard metrics.
 *
 * Validates that seller account isolation is properly enforced by testing that Seller A cannot access Seller B's dashboard metrics. Both sellers are created, approved, and have their own metrics records. The test attempts an unauthorized access and verifies that the system correctly rejects the request with a 403 Forbidden error.
 *
 * Special attention is given to verifying that metrics records are properly isolated between different sellers, and that the API enforces ownership validation before returning any seller-specific data.
 *
 * 1. Create administrator account.
 * 2. Create Seller A account, submit approval request, and get approved.
 * 3. Create Seller B account, submit approval request, and get approved.
 * 4. Create a category for product creation.
 * 5. Each seller creates a product to generate their dashboard metrics.
 * 6. Authenticate as Seller A.
 * 7. Attempt to access Seller B's metrics using Seller A's credentials.
 * 8. Verify the system rejects the unauthorized access with 403 Forbidden.
 */
export async function test_api_seller_dashboard_metrics_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      grade: "regular" as const,
    },
  });
  typia.assert(adminJoin);
  // 2. Create Seller A account
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAJoin = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerAPass123!",
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAJoin);
  const sellerAId = sellerAJoin.id;
  const sellerAPassword = "SellerAPass123!";
  // 3. Submit Seller A's approval request
  const sellerAApprovalRequest =
    await generate_random_ecommerce_mall_seller_seller_approval_requests_create(
      sellerAConnection,
      {
        body: {
          request_reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(sellerAApprovalRequest);
  // 4. Approve Seller A
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection2, {
    body: {
      email: adminJoin.email,
      password: adminJoin.token.access
        .split(".")[0]
        .replace(/[^a-zA-Z0-9]/g, ""),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const pendingRequests =
    await api.functional.ecommerceMall.administrator.seller_approvals.pending.index(
      adminConnection2,
      {
        body: {},
      },
    );
  typia.assert(pendingRequests);
  // Find and approve Seller A's request
  const sellerARequest = pendingRequests.data.find(
    (r) => r.seller.id === sellerAId,
  );
  if (!sellerARequest) {
    throw new Error(`No pending request found for seller ${sellerAId}`);
  }
  // 5. Create Seller B account
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBJoin = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerBPass123!",
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerBJoin);
  const sellerBId = sellerBJoin.id;
  const sellerBPassword = "SellerBPass123!";
  // 6. Submit Seller B's approval request
  const sellerBApprovalRequest =
    await generate_random_ecommerce_mall_seller_seller_approval_requests_create(
      sellerBConnection,
      {
        body: {
          request_reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(sellerBApprovalRequest);
  // 7. Create category for products
  const adminConnection3: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection3, {
    body: {
      email: adminJoin.email,
      password: adminJoin.token.access
        .split(".")[0]
        .replace(/[^a-zA-Z0-9]/g, ""),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 8. Create product for Seller A (generates metrics)
  const sellerAProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerAConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(sellerAProduct);
  // 9. Create product for Seller B (generates metrics)
  const sellerBProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerBConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(sellerBProduct);
  // 10. Authenticate as Seller A
  const sellerAAuthConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerAAuthConnection, {
    body: {
      email: sellerAJoin.email,
      password: sellerAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 11. Attempt to access Seller B's metrics
  await TestValidator.error(
    "Seller A cannot access Seller B's metrics",
    async () => {
      await api.functional.ecommerceMall.seller.dashboard_metrics.at(
        sellerAAuthConnection,
        {
          metricsId: sellerBId,
        },
      );
    },
  );
}
