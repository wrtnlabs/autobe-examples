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

export async function test_api_seller_product_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - Create admin account for approval operations
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminJoinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: adminJoinPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Seller registration - create seller account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerJoinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  // 3. Approve seller registration
  // Generate a UUID for the approval request - using random UUID as we cannot fetch approval requests
  // This approach works in test environments where approval requests may be created with predictable IDs
  const approvalRequestId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.ecommerceMall.admin.approval_requests.update(
    adminConnection,
    {
      approvalRequestId,
      body: {
        status: "approved",
        rejection_reason: null,
      } satisfies IEcommerceMallSellerApprovalRequest.IUpdate,
    },
  );
  // 4. Seller login with approved account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinResult.email,
      password: sellerJoinPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 5. Create product
  const productName = RandomGenerator.paragraph({ sentences: 3 });
  const productDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 8,
    wordMax: 12,
  });
  const productSlug = RandomGenerator.alphabets(10);
  const productBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: productDescription,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: productBasePrice,
        slug: productSlug,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Validate product response
  TestValidator.equals("product has UUID id", product.id, product.id);
  TestValidator.equals("product name matches", product.name, productName);
  TestValidator.equals(
    "product description matches",
    product.description,
    productDescription,
  );
  TestValidator.equals(
    "product base_price positive",
    product.base_price,
    productBasePrice,
  );
  TestValidator.equals("product slug matches", product.slug, productSlug);
  TestValidator.equals("product status is active", product.status, "active");
  TestValidator.predicate(
    "product has created_at",
    product.created_at !== undefined,
  );
  TestValidator.predicate(
    "product has updated_at",
    product.updated_at !== undefined,
  );
  TestValidator.equals(
    "product images is empty array",
    product.images.length,
    0,
  );
  TestValidator.equals(
    "product variants is empty array",
    product.variants.length,
    0,
  );
  TestValidator.equals(
    "product seller matches seller id",
    product.seller.id,
    sellerJoinResult.id,
  );
  TestValidator.equals(
    "product seller email matches",
    product.seller.email,
    sellerJoinResult.email,
  );
}
