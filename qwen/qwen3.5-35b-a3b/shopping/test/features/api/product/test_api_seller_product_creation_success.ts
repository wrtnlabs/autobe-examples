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
import { generate_random_ecommerce_mall_administrator_categories_create } from "../../../generate/generate_random_ecommerce_mall_administrator_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_product_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register seller account (pending approval)
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 2. Setup: Register administrator account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_administrator_join(adminJoinConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: adminEmail,
      password: adminPassword,
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 3. Setup: Login as administrator to approve seller
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Get pending approval requests and approve the seller
  const pendingApprovals =
    await api.functional.ecommerceMall.administrator.seller_approvals.pending.index(
      adminLoginConnection,
      {
        body: {
          page: 0,
          limit: 10,
        },
      },
    );
  typia.assert(pendingApprovals);
  TestValidator.equals(
    "pending approvals should have seller",
    pendingApprovals.data.some((req) => req.seller.id === sellerId),
    true,
  );
  const pendingRequest = pendingApprovals.data.find(
    (req) => req.seller.id === sellerId,
  );
  TestValidator.notEquals("pending request exists", pendingRequest, undefined);
  typia.assert(pendingRequest!);
  // Approve the seller
  const approvalUpdate =
    await api.functional.ecommerceMall.administrator.seller_approvals.update(
      adminLoginConnection,
      {
        requestId: pendingRequest!.id,
        body: {
          status: "approved" as const,
          reviewer_id: adminAuth.id,
        },
      },
    );
  typia.assert(approvalUpdate);
  TestValidator.equals(
    "approval status should be approved",
    approvalUpdate.status,
    "approved",
  );
  TestValidator.equals(
    "rejection reason should be null",
    approvalUpdate.rejectionReason,
    null,
  );
  // 5. Setup: Create category for product
  const adminCategoryConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminCategoryConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const category =
    await api.functional.ecommerceMall.administrator.categories.create(
      adminCategoryConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 6. Login with approved seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginAuth = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerLoginAuth);
  TestValidator.equals(
    "seller approval status should be approved",
    sellerLoginAuth.approval_status,
    "approved",
  );
  // 7. Create product
  const productName = RandomGenerator.name(2);
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: productName,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 8. Validate product creation
  TestValidator.equals("product name matches", product.name, productName);
  TestValidator.equals(
    "product category matches",
    product.category.id,
    category.id,
  );
  TestValidator.equals("product seller matches", product.seller.id, sellerId);
  TestValidator.equals("product is active", product.deleted_at, null);
  TestValidator.equals("product variants is empty", product.variants.length, 0);
  TestValidator.equals("product images is empty", product.images.length, 0);
  TestValidator.equals(
    "product review count is 0",
    product.reviewStats.review_count,
    0,
  );
  TestValidator.equals(
    "product average rating is null",
    product.reviewStats.average_rating,
    null,
  );
  TestValidator.predicate(
    "product created_at is set",
    product.created_at !== undefined,
  );
  TestValidator.predicate(
    "product updated_at is set",
    product.updated_at !== undefined,
  );
}
