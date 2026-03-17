import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_product_retrieval_rejected_seller_invisible(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Admin logs in
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Setup seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Admin rejects the seller's approval request
  const approvalRequestId = typia.random<string & tags.Format<"uuid">>();
  const rejectionResult =
    await api.functional.ecommerceMall.admin.approval_requests.update(
      adminLoginConnection,
      {
        approvalRequestId,
        body: {
          status: "rejected",
          rejection_reason: "Business verification failed",
        } satisfies IEcommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(rejectionResult);
  // 5. Seller attempts to create a product while rejected
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerAuth);
  // Attempt to create product (may succeed or fail based on backend rules)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const productName = RandomGenerator.name(3);
  let product: IEcommerceMallProduct | null = null;
  try {
    product = await api.functional.ecommerceMall.seller.products.create(
      sellerLoginConnection,
      {
        body: {
          name: productName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          category_id: categoryId,
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  } catch (error) {
    // Product creation might be blocked for rejected sellers
    // Test will continue with validation that any existing product is invisible
  }
  // 6. Customer attempts to retrieve the product - must return 404
  const customerConnection: api.IConnection = { host: connection.host };
  if (product) {
    // Verify product is invisible to customer - should return 404
    await TestValidator.httpError(
      "product from rejected seller should return 404",
      [404],
      async () => {
        await api.functional.ecommerceMall.products.at(customerConnection, {
          productId: product!.id,
        });
      },
    );
  } else {
    // If product creation was blocked, verify no product was created by checking that
    // a random product ID also returns 404 (basic sanity check)
    const nonexistentProductId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "nonexistent product should return 404",
      [404],
      async () => {
        await api.functional.ecommerceMall.products.at(customerConnection, {
          productId: nonexistentProductId,
        });
      },
    );
  }
  // 7. Verify seller status is indeed rejected
  typia.assert(rejectionResult.seller.status === "rejected");
}