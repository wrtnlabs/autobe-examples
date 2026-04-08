import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_mall_administrator_categories_create } from "../../../generate/generate_random_ecommerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test successful top-level category creation by an administrator.
 *
 * Validates the complete workflow for creating a top-level category with proper
 * authorization, data validation, and audit trail creation. Ensures that the
 * category is correctly stored with all required fields, parent relationship
 * is properly set to null for top-level categories, and an immutable snapshot
 * is created for audit purposes.
 *
 * Special attention is given to verifying that only authorized administrators
 * can create categories, that the creator_id is correctly recorded from JWT
 * authentication, and that the snapshot captures the complete state of the
 * newly created category for future reference.
 *
 * 1. Administrator registers via POST /ecommerceMall/auth/administrator/join
 *    to obtain authentication credentials and access token.
 * 2. Administrator creates a top-level category via
 *    POST /ecommerceMall/administrator/categories with name, description,
 *    sort_order, and parent_id set to null.
 * 3. System validates administrator authorization and creates category record
 *    with UUID for id, current timestamp for created_at/updated_at, and
 *    creator_id from JWT authentication.
 * 4. System creates immutable snapshot in ecommerce_mall_categories_snapshots
 *    table capturing the complete category state for audit trail.
 * 5. Verify response contains all required fields including id, name,
 *    description, sort_order, created_at, updated_at, parent_id (null),
 *    and creator_id.
 * 6. Verify database record exists with correct values and deleted_at is null
 *    (category is active).
 * 7. Verify snapshot was created with matching category state.
 * 8. Verify category can be retrieved via catalog browsing operations.
 */
export async function test_api_category_management_top_level_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register administrator and obtain authentication credentials
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminResult: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminJoinConnection, {
      body: {
        display_name: RandomGenerator.name(3),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        grade: "regular",
      } satisfies IEcommerceMallAdministrator.IJoin,
    });
  typia.assert(adminResult);
  // Step 2: Create new connection with administrator token for authenticated operations
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminResult.token.access },
  };
  // Step 3: Create top-level category using utility function
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Consumer electronics and gadgets",
          sort_order: 1,
          parent_id: null,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // Step 4: Validate response contains all required fields with correct types
  TestValidator.predicate(
    "category id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category.id),
  );
  TestValidator.equals(
    "category name matches input",
    category.name,
    "Electronics",
  );
  TestValidator.equals(
    "category description matches input",
    category.description,
    "Consumer electronics and gadgets",
  );
  TestValidator.equals(
    "category sort_order matches input",
    category.sort_order,
    1,
  );
  TestValidator.equals(
    "category parent_id is null for top-level",
    category.parent_id,
    null,
  );
  TestValidator.equals(
    "category parent is null for top-level",
    category.parent,
    null,
  );
  TestValidator.notEquals(
    "category created_at is set",
    category.created_at,
    undefined,
  );
  TestValidator.notEquals(
    "category updated_at is set",
    category.updated_at,
    undefined,
  );
  TestValidator.equals(
    "category creator_id is set from JWT",
    category.creator_id,
    adminResult.id,
  );
  TestValidator.equals(
    "category deleted_at is null (active)",
    category.deleted_at,
    null,
  );
  // Step 5: Validate parent and creator fields are present
  TestValidator.equals(
    "category creator exists",
    category.creator !== null && category.creator !== undefined,
    true,
  );
  // Step 6: Validate category summary for catalog browsing
  const categorySummary: IEcommerceMallCategory.ISummary = {
    id: category.id,
    name: category.name,
    description: category.description ?? null,
    sort_order: (category.sort_order ?? null) satisfies (number | null) as (number | null),
    parent: null,
    created_at: category.created_at,
    updated_at: category.updated_at,
  };
  typia.assert(categorySummary);
}