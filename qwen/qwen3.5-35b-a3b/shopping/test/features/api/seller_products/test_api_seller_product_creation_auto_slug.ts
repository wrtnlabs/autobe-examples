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

export async function test_api_seller_product_creation_auto_slug(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  // 2. Admin joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 3. Find approval request and approve seller
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
  // 4. Create product WITHOUT providing slug
  const productName = "Premium Wireless Headphones";
  const productCreation =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: productName,
          description:
            "High-quality wireless headphones with noise cancellation",
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          slug: undefined, // Not provided - should be auto-generated
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(productCreation);
  // 5. Verify auto-generated slug
  const expectedSlug = productName.toLowerCase().replace(/\s+/g, "-");
  TestValidator.equals(
    "auto-generated slug matches expected format",
    productCreation.slug,
    expectedSlug,
  );
  // 6. Verify all other fields are correctly populated
  TestValidator.equals(
    "product name matches",
    productCreation.name,
    productName,
  );
  TestValidator.equals(
    "description provided",
    productCreation.description,
    productCreation.description,
  );
  TestValidator.predicate(
    "base price is positive",
    productCreation.base_price > 0,
  );
  TestValidator.equals(
    "seller_id is valid UUID",
    productCreation.seller_id,
    productCreation.seller_id,
  );
  TestValidator.equals(
    "category_id is valid UUID",
    productCreation.category_id,
    productCreation.category_id,
  );
  TestValidator.predicate(
    "has valid created_at",
    new Date(productCreation.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "has valid updated_at",
    new Date(productCreation.updated_at).getTime() > 0,
  );
  TestValidator.equals("status is active", productCreation.status, "active");
  TestValidator.equals("deleted_at is null", productCreation.deleted_at, null);
  TestValidator.predicate(
    "seller summary is valid",
    productCreation.seller.id !== undefined,
  );
  TestValidator.predicate(
    "category summary is valid",
    productCreation.category.id !== undefined,
  );
  TestValidator.predicate(
    "images array exists",
    Array.isArray(productCreation.images),
  );
  TestValidator.predicate(
    "variants array exists",
    Array.isArray(productCreation.variants),
  );
}
