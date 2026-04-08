import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin product listing endpoint for pagination functionality.
 *
 * Validates the GET /ecommerceMall/admin/admin/products endpoint returns a
 * paginated list of all active products on the platform. Verifies that
 * pagination metadata is correctly calculated (current, limit, records, pages)
 * and that product summaries contain all required fields including UUID format,
 * pricing, stock status, category information, and seller details.
 *
 * Only active products (deleted_at IS NULL) should be returned, sorted by
 * creation date in descending order (newest first).
 *
 * 1. Register and authenticate as admin to obtain authorization token.
 * 2. Call the admin product listing endpoint.
 * 3. Validate pagination metadata structure and values.
 * 4. Verify each product summary contains required fields.
 * 5. Validate seller information for each product.
 * 6. Verify products are sorted by createdAt DESC.
 */
export async function test_api_admin_product_listing_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Call the admin product listing endpoint
  const output =
    await api.functional.ecommerceMall.admin.admin.products.list(
      adminConnection,
    );
  typia.assert(output);
  // 3. Validate pagination metadata structure
  TestValidator.equals("has pagination", output.pagination !== undefined, true);
  TestValidator.equals("has data array", Array.isArray(output.data), true);
  const pagination = output.pagination;
  TestValidator.predicate(
    "pagination current is valid number",
    typeof pagination.current === "number" && pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid number",
    typeof pagination.limit === "number" && pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is valid number",
    typeof pagination.records === "number" && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid number",
    typeof pagination.pages === "number" && pagination.pages >= 0,
  );
  // Validate pagination calculation
  if (pagination.records > 0) {
    const calculatedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pages calculated correctly",
      pagination.pages,
      calculatedPages,
    );
  } else {
    TestValidator.equals("pages is 0 when no records", pagination.pages, 0);
  }
  // Validate data length matches pagination records or is less on last page
  if (output.data.length > 0) {
    TestValidator.predicate(
      "data length within bounds",
      output.data.length <= pagination.limit,
    );
  }
  // 4 & 5. Validate each product summary contains required fields
  for (const product of output.data) {
    // Validate id is UUID format
    TestValidator.predicate(
      "product id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        product.id,
      ),
    );
    // Validate name
    TestValidator.predicate(
      "product name is non-empty string",
      typeof product.name === "string" && product.name.length > 0,
    );
    // Validate basePrice
    TestValidator.predicate(
      "product basePrice is number",
      typeof product.basePrice === "number",
    );
    // Validate categoryName
    TestValidator.predicate(
      "product categoryName is non-empty string",
      typeof product.categoryName === "string" &&
        product.categoryName.length > 0,
    );
    // Validate hasStock
    TestValidator.predicate(
      "product hasStock is boolean",
      typeof product.hasStock === "boolean",
    );
    // Validate timestamps
    TestValidator.predicate(
      "product createdAt is valid ISO date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(product.createdAt),
    );
    TestValidator.predicate(
      "product updatedAt is valid ISO date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(product.updatedAt),
    );
    // Validate seller object contains required fields
    if (product.seller) {
      // Seller id is UUID
      TestValidator.predicate(
        "seller id is valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          product.seller.id,
        ),
      );
      // Seller email
      TestValidator.predicate(
        "seller email is valid format",
        typeof product.seller.email === "string" &&
          product.seller.email.includes("@"),
      );
      // Seller approvalStatus
      TestValidator.predicate(
        "seller approvalStatus is non-empty string",
        typeof product.seller.approvalStatus === "string" &&
          product.seller.approvalStatus.length > 0,
      );
      // Seller suspensionStatus
      TestValidator.predicate(
        "seller suspensionStatus is non-empty string",
        typeof product.seller.suspensionStatus === "string" &&
          product.seller.suspensionStatus.length > 0,
      );
    }
  }
  // 6. Verify products are sorted by createdAt DESC (newest first)
  if (output.data.length > 1) {
    for (let i = 0; i < output.data.length - 1; i++) {
      const current = new Date(output.data[i].createdAt).getTime();
      const next = new Date(output.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        "products sorted by createdAt DESC",
        current >= next,
      );
    }
  }
}
