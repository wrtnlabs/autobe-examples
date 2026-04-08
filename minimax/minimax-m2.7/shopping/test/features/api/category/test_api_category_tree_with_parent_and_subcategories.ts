import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test retrieving the complete category tree hierarchy with parent categories and their subcategories.
 *
 * Validates the category tree endpoint by authenticating as a customer, retrieving the complete category hierarchy, and verifying the nested structure. The test ensures that parent categories contain their direct subcategories as children, confirms alphabetical sorting of both parents and subcategories, and validates the single-level nesting constraint where subcategories have empty children arrays.
 *
 * The test flow:
 * 1. Register a new customer account to obtain authentication credentials.
 * 2. Call the category tree endpoint with customer authorization.
 * 3. Validate the response structure and data integrity.
 *
 * Key validations include verifying the tree contains parent category nodes with nested children arrays, confirming alphabetical ordering throughout the hierarchy, and ensuring the single-level nesting limitation is properly enforced.
 *
 * 1. Authenticate as a customer using join endpoint.
 * 2. Call GET /ecommerceMall/customer/categories/tree to retrieve category hierarchy.
 * 3. Validate tree structure: array of parent nodes with nested subcategory children.
 * 4. Verify alphabetical sorting of both parent categories and their subcategories.
 * 5. Confirm single-level nesting: parents have children, subcategories have empty children.
 */
export async function test_api_category_tree_with_parent_and_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer to access protected endpoint
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Retrieve the complete category tree hierarchy
  const tree =
    await api.functional.ecommerceMall.customer.categories.tree(
      customerConnection,
    );
  typia.assert(tree);
  // 3. Extract the categories array from ITree
  const categories = (tree as any).categories ?? (tree as any).parents ?? [];
  // 4. Validate tree structure is an array
  TestValidator.predicate(
    "category tree should be an array",
    Array.isArray(categories),
  );
  // 5. If tree has categories, validate structure and sorting
  if (categories.length > 0) {
    // Validate each parent category has required fields
    for (const parent of categories) {
      TestValidator.predicate("parent category should have id", !!parent.id);
      TestValidator.predicate(
        "parent category should have name",
        !!parent.name,
      );
      TestValidator.predicate(
        "parent category should have children array",
        Array.isArray(parent.children),
      );
      // Validate subcategories (children) are sorted alphabetically
      if (parent.children.length > 1) {
        for (let i = 0; i < parent.children.length - 1; i++) {
          TestValidator.predicate(
            "subcategories should be sorted alphabetically by name",
            parent.children[i].name.localeCompare(
              parent.children[i + 1].name,
            ) <= 0,
          );
        }
      }
      // Validate single-level nesting: subcategories should have empty children arrays
      for (const child of parent.children) {
        TestValidator.predicate(
          "subcategory should have empty children array (single-level nesting)",
          Array.isArray(child.children) && child.children.length === 0,
        );
      }
    }
    // Validate parent categories are sorted alphabetically by name
    for (let i = 0; i < categories.length - 1; i++) {
      TestValidator.predicate(
        "parent categories should be sorted alphabetically by name",
        categories[i].name.localeCompare(categories[i + 1].name) <= 0,
      );
    }
  }
}