import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
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
import { generate_random_shopping_mall_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_approval_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test administrator retrieval of product snapshot.
 *
 * This test verifies the complete product snapshot workflow:
 * 1. Administrator registration and authentication
 * 2. Seller registration and approval by administrator
 * 3. Product creation by seller
 * 4. Product edit to generate snapshot
 * 5. Administrator retrieves snapshot list and specific snapshot
 * 6. Validates snapshot contains all preserved historical data
 */
export async function test_api_product_snapshot_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator Setup - Register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Seller Setup - Register seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Submit seller approval request
  const approvalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  TestValidator.equals("initial status", approvalRequest.status, "pending");
  // 4. Administrator approves seller
  const approvedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals("approval status", approvedRequest.status, "approved");
  // 5. Seller creates product
  const originalName = RandomGenerator.paragraph({ sentences: 2 });
  const originalDescription = RandomGenerator.content({ paragraphs: 2 });
  const originalPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: originalName,
        description: originalDescription,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: originalPrice,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  TestValidator.equals("product name", product.name, originalName);
  TestValidator.equals("product base price", product.base_price, originalPrice);
  // 6. Seller edits product to create snapshot
  const updatedName = RandomGenerator.paragraph({ sentences: 1 });
  const updatedPrice = product.base_price + 1000;
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: updatedName,
        base_price: updatedPrice,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  TestValidator.equals("name updated", updatedProduct.name, updatedName);
  TestValidator.equals(
    "price updated",
    updatedProduct.base_price,
    updatedPrice,
  );
  // 7. Administrator retrieves product snapshots list to find snapshot ID
  const snapshotsPage =
    await api.functional.shoppingMall.administrator.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  TestValidator.predicate("has snapshots", snapshotsPage.data.length > 0);
  // Get the first snapshot (most recent from the edit)
  const snapshotSummary = snapshotsPage.data[0];
  // 8. Administrator retrieves specific snapshot by ID
  const snapshot =
    await api.functional.shoppingMall.administrator.products.snapshots.at(
      adminConnection,
      {
        productId: product.id,
        snapshotId: snapshotSummary.id,
      },
    );
  typia.assert(snapshot);
  // 9. Validate snapshot contains all preserved fields
  TestValidator.equals("snapshot id exists", typeof snapshot.id, "string");
  TestValidator.equals("snapshot name preserved", snapshot.name, updatedName);
  TestValidator.predicate(
    "snapshot description is non-empty string",
    typeof snapshot.description === "string" && snapshot.description.length > 0,
  );
  TestValidator.equals(
    "snapshot base_price preserved",
    snapshot.base_price,
    updatedPrice,
  );
  TestValidator.predicate(
    "snapshot has created_at",
    snapshot.created_at !== undefined,
  );
  // 10. Validate product summary in snapshot
  TestValidator.predicate(
    "product has min price",
    typeof snapshot.product.min === "number",
  );
  TestValidator.predicate(
    "product has max price",
    typeof snapshot.product.max === "number",
  );
  // 11. Validate category summary in snapshot
  TestValidator.predicate("category exists", snapshot.category !== undefined);
  TestValidator.equals(
    "category id exists",
    typeof snapshot.category.id,
    "string",
  );
  TestValidator.equals(
    "category name exists",
    typeof snapshot.category.name,
    "string",
  );
  TestValidator.equals(
    "category description exists",
    typeof snapshot.category.description,
    "string",
  );
  TestValidator.predicate(
    "category parent is null or object",
    snapshot.category.parent === null ||
      typeof snapshot.category.parent === "object",
  );
  TestValidator.equals(
    "category hasChildren is boolean",
    typeof snapshot.category.hasChildren,
    "boolean",
  );
  // 12. Validate snapshot timestamp reflects edit time
  const snapshotTime = new Date(snapshot.created_at).getTime();
  const productUpdateTime = new Date(updatedProduct.updated_at).getTime();
  TestValidator.predicate(
    "snapshot created after product update",
    snapshotTime >= productUpdateTime - 1000,
  ); // 1 second tolerance
}