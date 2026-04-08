import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboard";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_dashboard_data_isolation_between_sellers(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminJoinConnection, {});
  // Admin login with credentials
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Register Seller A
  const sellerAJoinConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 3. Admin approves Seller A
  const pendingApprovalsA =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(pendingApprovalsA);
  const sellerAApproval = pendingApprovalsA.data.find(
    (approval) => approval.seller.email === sellerA.email,
  );
  if (!sellerAApproval) throw new Error("Seller A approval not found");
  await api.functional.ecommerceMall.admin.admin.seller_approvals.approve(
    adminConnection,
    {
      approvalId: sellerAApproval.id,
    },
  );
  // 4. Seller A creates 3 products
  const sellerALoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerALoginConnection, {
    body: {
      email: sellerA.email,
      password: "password123",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  await ArrayUtil.asyncRepeat(3, async () => {
    await generate_random_ecommerce_mall_seller_products_create(
      sellerALoginConnection,
      {},
    );
  });
  // 5. Register Seller B
  const sellerBJoinConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 6. Admin approves Seller B
  const pendingApprovalsB =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(pendingApprovalsB);
  const sellerBApproval = pendingApprovalsB.data.find(
    (approval) => approval.seller.email === sellerB.email,
  );
  if (!sellerBApproval) throw new Error("Seller B approval not found");
  await api.functional.ecommerceMall.admin.admin.seller_approvals.approve(
    adminConnection,
    {
      approvalId: sellerBApproval.id,
    },
  );
  // 7. Seller B creates 2 products
  const sellerBLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerBLoginConnection, {
    body: {
      email: sellerB.email,
      password: "password123",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  await ArrayUtil.asyncRepeat(2, async () => {
    await generate_random_ecommerce_mall_seller_products_create(
      sellerBLoginConnection,
      {},
    );
  });
  // 8. Both sellers view their dashboards
  const sellerADashboard =
    await api.functional.ecommerceMall.seller.dashboard.at(
      sellerALoginConnection,
    );
  typia.assert(sellerADashboard);
  const sellerBDashboard =
    await api.functional.ecommerceMall.seller.dashboard.at(
      sellerBLoginConnection,
    );
  typia.assert(sellerBDashboard);
  // 9. Validate data isolation - each dashboard shows only its seller's products
  TestValidator.equals(
    "Seller A dashboard shows only Seller A's products",
    sellerADashboard.totalProducts,
    3,
  );
  TestValidator.equals(
    "Seller B dashboard shows only Seller B's products",
    sellerBDashboard.totalProducts,
    2,
  );
  // Validate other metrics are also isolated (no orders yet)
  TestValidator.equals(
    "Seller A dashboard totalOrderItems is 0",
    sellerADashboard.totalOrderItems,
    0,
  );
  TestValidator.equals(
    "Seller B dashboard totalOrderItems is 0",
    sellerBDashboard.totalOrderItems,
    0,
  );
  TestValidator.equals(
    "Seller A pending cancellations is 0",
    sellerADashboard.pendingCancellationRequests,
    0,
  );
  TestValidator.equals(
    "Seller B pending cancellations is 0",
    sellerBDashboard.pendingCancellationRequests,
    0,
  );
  TestValidator.equals(
    "Seller A pending refunds is 0",
    sellerADashboard.pendingRefundRequests,
    0,
  );
  TestValidator.equals(
    "Seller B pending refunds is 0",
    sellerBDashboard.pendingRefundRequests,
    0,
  );
}
