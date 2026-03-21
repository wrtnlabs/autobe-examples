import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
import { generate_random_ecommerce_mall_admin_seller_approvals_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_approvals_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";

export async function test_api_product_creation_by_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account (creates pending approval status)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const pendingSeller = await api.functional.ecommerceMall.auth.seller.join(
    sellerJoinConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword satisfies string & tags.Format<"password">,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(pendingSeller);
  TestValidator.equals(
    "seller approval status is pending",
    pendingSeller.approval_status,
    "pending",
  );
  // 2. Create admin and approve the seller registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // Create admin account first
  await api.functional.ecommerceMall.auth.admin.join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword satisfies string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Login as admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.admin.login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Approve the seller
  const approval =
    await api.functional.ecommerceMall.admin.seller_approvals.create(
      adminLoginConnection,
      {
        body: {
          sellerId: pendingSeller.id,
          status: "approved",
        } satisfies IEcommerceMallSellerApproval.ICreate,
      },
    );
  typia.assert(approval);
  TestValidator.equals(
    "approval status is approved",
    approval.status,
    "approved",
  );
  // 3. Approved seller logs in
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  const loggedInSeller = await api.functional.ecommerceMall.auth.seller.login(
    approvedSellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(loggedInSeller);
  TestValidator.equals(
    "seller is now approved",
    loggedInSeller.approval_status,
    "approved",
  );
  // 4. Create product using generation function (handles category automatically)
  const product = await api.functional.ecommerceMall.seller.products.create(
    approvedSellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 10 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Verify product creation
  TestValidator.predicate(
    "product has valid UUID ID",
    /^[0-9a-f-]{36}$/i.test(product.id),
  );
  TestValidator.predicate("product has valid name", product.name.length > 0);
  TestValidator.predicate(
    "product has valid description",
    product.description.length > 0,
  );
  TestValidator.predicate(
    "product base price is positive",
    product.base_price > 0,
  );
  TestValidator.predicate(
    "product has seller association",
    product.seller !== undefined,
  );
  TestValidator.predicate(
    "product has valid created_at",
    product.created_at.length > 0,
  );
  TestValidator.predicate(
    "product has valid updated_at",
    product.updated_at.length > 0,
  );
  TestValidator.equals("product is not soft-deleted", product.deleted_at, null);
}
