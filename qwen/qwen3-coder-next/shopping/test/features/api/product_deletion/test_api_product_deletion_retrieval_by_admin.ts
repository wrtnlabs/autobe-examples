import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductDeletion";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_product_deletions_create } from "../../../generate/generate_random_ecommerce_mall_admin_product_deletions_create";
import { prepare_random_ecommerce_mall_product_deletion } from "../../../prepare/prepare_random_ecommerce_mall_product_deletion";

/**
 * Test administrator retrieves a specific product deletion request.
 * 1. Admin creates a product deletion request
 * 2. Admin retrieves the created deletion request
 * 3. Validate retrieved request matches created request
 */
export async function test_api_product_deletion_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a new product deletion request
  // Since we don't have product listing API, create deletion request with valid format
  const productDeletion =
    await api.functional.ecommerceMall.admin.product_deletions.create(
      adminConnection,
      {
        body: {
          product_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallProductDeletion.ICreate,
      },
    );
  typia.assert(productDeletion);
  // 3. Retrieve the deletion request using the created ID
  const retrieved =
    await api.functional.ecommerceMall.admin.product_deletions.at(
      adminConnection,
      {
        productDeletionId: productDeletion.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate retrieved deletion request matches original
  TestValidator.equals(
    "product ID matches",
    retrieved.product_id,
    productDeletion.product_id,
  );
  TestValidator.equals("admin ID matches", retrieved.admin_id, adminAuth.id);
  TestValidator.equals(
    "reason matches",
    retrieved.reason,
    productDeletion.reason,
  );
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.predicate(
    "has valid timestamps",
    new Date(retrieved.created_at) <= new Date(),
  );
  TestValidator.equals(
    "product summary ID matches",
    retrieved.product.id,
    productDeletion.product_id,
  );
  TestValidator.equals(
    "admin summary ID matches",
    retrieved.admin.id,
    adminAuth.id,
  );
}
