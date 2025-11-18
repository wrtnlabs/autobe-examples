import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryLocalization";

/**
 * Ensure category localization creation is rejected for lifecycle-ineligible
 * categories.
 *
 * Business goal:
 *
 * - When a category is transitioned to a lifecycle status that should not allow
 *   further localizations (for example, a deprecated/hidden/archive-like
 *   state), any attempt to add a new localization must fail with a
 *   business-rule error.
 *
 * What this E2E test covers:
 *
 * 1. Admin registration and authentication via POST /auth/admin/join.
 * 2. Creation of a new category in a normal (eligible) lifecycle state using POST
 *    /shoppingMall/admin/categories with IShoppingMallCategory.ICreate.
 * 3. Lifecycle transition of that category to an ineligible state using PUT
 *    /shoppingMall/admin/categories/{categoryId} with
 *    IShoppingMallCategory.IUpdate (changing `status`).
 * 4. An attempted localization creation for that category via POST
 *    /shoppingMall/admin/categories/{categoryId}/localizations using
 *    IShoppingMallCategoryLocalization.ICreate, with a valid locale/name
 *    payload.
 * 5. Validation that the localization creation call fails (throws) when the
 *    category is in the ineligible status, expressed with TestValidator.error,
 *    without asserting any specific HTTP status code or error message.
 *
 * Steps in detail:
 *
 * 1. Call api.functional.auth.admin.join with a realistic
 *    IShoppingMallAdminJoin.ICreate body built from typia.random and
 *    RandomGenerator helpers to simulate an administrator joining the system.
 *
 *    - Assert the returned IShoppingMallAdmin.IAuthorized structure using
 *         typia.assert.
 *    - Rely on the SDK to store the access token into connection.headers
 *         automatically; do not touch headers manually.
 * 2. Create a category via api.functional.shoppingMall.admin.categories.create:
 *
 *    - Build a concrete IShoppingMallCategory.ICreate body:
 *
 *         - Parent_id: null (root category).
 *         - Slug: a random lower-case slug (for example, using RandomGenerator helpers or
 *                   typia.random for strings).
 *         - Name_en: a short random name.
 *         - Description_en: a small paragraph or null.
 *         - Status: an "eligible" status string such as "active".
 *         - Sort_order: a small int32 (use typia.random with tags.Type<"int32">).
 *         - Is_leaf: true.
 *    - Call the create endpoint and assert the IShoppingMallCategory response with
 *         typia.assert.
 * 3. Update the category lifecycle to an ineligible status using
 *    api.functional.shoppingMall.admin.categories.update:
 *
 *    - Use the category.id from step (2) as categoryId.
 *    - Provide an IShoppingMallCategory.IUpdate body where only `status` is set to a
 *         clearly different value, such as "deprecated".
 *    - Assert the updated IShoppingMallCategory response and verify with
 *         TestValidator.equals that the status is the new ineligible value.
 * 4. Attempt to create a localization on the ineligible category using
 *    api.functional.shoppingMall.admin.categories.localizations.create:
 *
 *    - Construct a valid IShoppingMallCategoryLocalization.ICreate body:
 *
 *         - Locale: some locale string, e.g. "en-US" or a simple code like "ko-KR".
 *         - Name: random localized name.
 *         - Description, seo_title, seo_description: optional strings or null.
 *    - Wrap the call in await TestValidator.error with a descriptive title like
 *         "creating localization for ineligible category must fail" and an
 *         async callback that invokes the create endpoint with categoryId =
 *         category.id and the above body.
 *    - This asserts that the backend enforces the lifecycle rule by throwing an
 *         error; the test does not inspect status codes or error payloads.
 * 5. Optionally, confirm idempotent failure by trying the same localization
 *    creation a second time, again wrapped in TestValidator.error, to show that
 *    the category remains ineligible and no localization can be added while the
 *    status is the ineligible one.
 *
 * Implementation notes:
 *
 * - Never add or modify imports; use only the imports in the template.
 * - Use `satisfies` when constructing request bodies for
 *   IShoppingMallAdminJoin.ICreate, IShoppingMallCategory.ICreate,
 *   IShoppingMallCategory.IUpdate, and
 *   IShoppingMallCategoryLocalization.ICreate, without explicit type
 *   annotations on the variables.
 * - Always call typia.assert on non-void API responses.
 * - Use TestValidator.equals and TestValidator.predicate with descriptive titles
 *   for business logic checks.
 * - For negative tests, only assert that an error occurs via TestValidator.error
 *   — do not assert status code or error message details.
 */
export async function test_api_admin_category_localization_create_reject_ineligible_category(
  connection: api.IConnection,
) {
  // 1. Admin join and authentication context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.local/join",
    referrer: "https://admin.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // 2. Create an initially active/eligible category
  const eligibleStatus = "active";
  const createCategoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(12),
    name_en: RandomGenerator.name(1),
    description_en: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    status: eligibleStatus,
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: createCategoryBody,
    });
  typia.assert(createdCategory);

  TestValidator.equals(
    "created category has eligible initial status",
    createdCategory.status,
    eligibleStatus,
  );

  // 3. Transition category to an ineligible lifecycle status
  const ineligibleStatus = "deprecated";
  const updateCategoryBody = {
    status: ineligibleStatus,
  } satisfies IShoppingMallCategory.IUpdate;

  const updatedCategory =
    await api.functional.shoppingMall.admin.categories.update(connection, {
      categoryId: createdCategory.id,
      body: updateCategoryBody,
    });
  typia.assert(updatedCategory);

  TestValidator.equals(
    "updated category has ineligible status applied",
    updatedCategory.status,
    ineligibleStatus,
  );

  // 4. Attempt to create a localization for the ineligible category
  const localizationBody = {
    locale: "en-US",
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    seo_title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    seo_description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallCategoryLocalization.ICreate;

  await TestValidator.error(
    "creating localization for ineligible category must fail",
    async () => {
      await api.functional.shoppingMall.admin.categories.localizations.create(
        connection,
        {
          categoryId: createdCategory.id,
          body: localizationBody,
        },
      );
    },
  );

  // 5. Optional: repeat the failure to ensure status remains ineligible
  await TestValidator.error(
    "repeated localization creation for ineligible category must still fail",
    async () => {
      await api.functional.shoppingMall.admin.categories.localizations.create(
        connection,
        {
          categoryId: createdCategory.id,
          body: localizationBody,
        },
      );
    },
  );
}
