import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_seller_product_update_partial_fields(
  connection: api.IConnection,
) {
  // 1. Seller join / authentication
  const joinBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create a fully populated product as that seller
  const createBody = typia.random<IShoppingMallProduct.ICreate>();
  const created: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallProduct>(created);

  // Sanity: nullable fields must start as non-null so we can verify preservation/clearing
  // If any of them are null, we re-create until we get non-null brand/model_name/primary_image_uri.
  // To avoid loops, we instead overwrite via an immediate update to enforce non-null values.
  const initialUpdateBody = {
    brand:
      created.brand ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 10 }),
    model_name:
      created.model_name ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 8 }),
    primary_image_uri:
      created.primary_image_uri ?? typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallProduct.IUpdate;

  const initialized: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId: created.id,
      body: initialUpdateBody,
    });
  typia.assert<IShoppingMallProduct>(initialized);

  // Ensure we indeed have non-null values for nullable fields after initialization
  TestValidator.predicate(
    "initialized brand must be non-null",
    initialized.brand !== null && initialized.brand !== undefined,
  );
  TestValidator.predicate(
    "initialized model_name must be non-null",
    initialized.model_name !== null && initialized.model_name !== undefined,
  );
  TestValidator.predicate(
    "initialized primary_image_uri must be non-null",
    initialized.primary_image_uri !== null &&
      initialized.primary_image_uri !== undefined,
  );

  // Capture baseline values for all tested fields
  const baseline = initialized;

  // 3. First partial update: update only summary and status
  const updatedSummary = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });
  const updatedStatus = `${baseline.status}-updated`;

  const firstUpdateBody = {
    summary: updatedSummary,
    status: updatedStatus,
  } satisfies IShoppingMallProduct.IUpdate;

  const first: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId: baseline.id,
      body: firstUpdateBody,
    });
  typia.assert<IShoppingMallProduct>(first);

  // Verify only summary and status changed
  TestValidator.equals(
    "product id remains the same after first partial update",
    first.id,
    baseline.id,
  );
  TestValidator.equals(
    "summary updated in first partial update",
    first.summary,
    updatedSummary,
  );
  TestValidator.equals(
    "status updated in first partial update",
    first.status,
    updatedStatus,
  );

  TestValidator.equals(
    "code remains unchanged after first partial update",
    first.code,
    baseline.code,
  );
  TestValidator.equals(
    "title remains unchanged after first partial update",
    first.title,
    baseline.title,
  );
  TestValidator.equals(
    "description remains unchanged after first partial update",
    first.description,
    baseline.description,
  );
  TestValidator.equals(
    "brand remains unchanged after first partial update",
    first.brand,
    baseline.brand,
  );
  TestValidator.equals(
    "model_name remains unchanged after first partial update",
    first.model_name,
    baseline.model_name,
  );
  TestValidator.equals(
    "primary_image_uri remains unchanged after first partial update",
    first.primary_image_uri,
    baseline.primary_image_uri,
  );
  TestValidator.equals(
    "default_locale remains unchanged after first partial update",
    first.default_locale,
    baseline.default_locale,
  );

  // 4. Second update: explicitly clear nullable fields via null
  const secondUpdateBody = {
    brand: null,
    model_name: null,
  } satisfies IShoppingMallProduct.IUpdate;

  const second: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId: first.id,
      body: secondUpdateBody,
    });
  typia.assert<IShoppingMallProduct>(second);

  // Verify nullable fields cleared, others unchanged relative to first
  TestValidator.equals(
    "brand is cleared to null in second update",
    second.brand,
    null,
  );
  TestValidator.equals(
    "model_name is cleared to null in second update",
    second.model_name,
    null,
  );

  TestValidator.equals(
    "code remains unchanged after second update",
    second.code,
    first.code,
  );
  TestValidator.equals(
    "title remains unchanged after second update",
    second.title,
    first.title,
  );
  TestValidator.equals(
    "summary remains unchanged after second update",
    second.summary,
    first.summary,
  );
  TestValidator.equals(
    "description remains unchanged after second update",
    second.description,
    first.description,
  );
  TestValidator.equals(
    "status remains unchanged after second update",
    second.status,
    first.status,
  );
  TestValidator.equals(
    "primary_image_uri remains unchanged after second update",
    second.primary_image_uri,
    first.primary_image_uri,
  );
  TestValidator.equals(
    "default_locale remains unchanged after second update",
    second.default_locale,
    first.default_locale,
  );

  // 5. Third update: re-populate nullable fields to non-null values, still partial
  const repopulatedBrand = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 10,
  });
  const repopulatedModelName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 8,
  });

  const thirdUpdateBody = {
    brand: repopulatedBrand,
    model_name: repopulatedModelName,
  } satisfies IShoppingMallProduct.IUpdate;

  const third: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId: second.id,
      body: thirdUpdateBody,
    });
  typia.assert<IShoppingMallProduct>(third);

  TestValidator.equals(
    "brand is re-populated in third update",
    third.brand,
    repopulatedBrand,
  );
  TestValidator.equals(
    "model_name is re-populated in third update",
    third.model_name,
    repopulatedModelName,
  );

  TestValidator.equals(
    "code remains unchanged after third update",
    third.code,
    second.code,
  );
  TestValidator.equals(
    "title remains unchanged after third update",
    third.title,
    second.title,
  );
  TestValidator.equals(
    "summary remains unchanged after third update",
    third.summary,
    second.summary,
  );
  TestValidator.equals(
    "description remains unchanged after third update",
    third.description,
    second.description,
  );
  TestValidator.equals(
    "status remains unchanged after third update",
    third.status,
    second.status,
  );
  TestValidator.equals(
    "primary_image_uri remains unchanged after third update",
    third.primary_image_uri,
    second.primary_image_uri,
  );
  TestValidator.equals(
    "default_locale remains unchanged after third update",
    third.default_locale,
    second.default_locale,
  );
}
