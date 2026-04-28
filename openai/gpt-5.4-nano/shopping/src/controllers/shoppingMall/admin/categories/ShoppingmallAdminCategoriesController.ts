import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallCategory } from "../../../../api/structures/IPageIShoppingMallCategory";
import { IShoppingMallCategory } from "../../../../api/structures/IShoppingMallCategory";
import { AdminAuth } from "../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../decorators/payload/AdminPayload";
import { deleteShoppingMallAdminCategoriesCategoryId } from "../../../../providers/deleteShoppingMallAdminCategoriesCategoryId";
import { getShoppingMallAdminCategoriesCategoryId } from "../../../../providers/getShoppingMallAdminCategoriesCategoryId";
import { patchShoppingMallAdminCategories } from "../../../../providers/patchShoppingMallAdminCategories";
import { postShoppingMallAdminCategories } from "../../../../providers/postShoppingMallAdminCategories";
import { putShoppingMallAdminCategoriesCategoryId } from "../../../../providers/putShoppingMallAdminCategoriesCategoryId";

@Controller("/shoppingMall/admin/categories")
export class ShoppingmallAdminCategoriesController {
  /**
   * Create a new category in the shopping mall catalog.
   *
   * This operation is the administrative entry point for the platform’s category hierarchy. Categories are used to organize products for storefront browsing, including optional one-level nesting where a category may reference exactly one parent category (child category), while deeper nesting is not allowed.
   *
   * Only administrator actors are permitted to perform this action. Non-administrator attempts to create categories must be rejected.
   *
   * The operation persists the category’s customer-facing name and description, its stable URL identifier (slug), and its browsing configuration (visibility and display_order). When a parent category is provided, it defines the one-level nesting relationship that determines how customers will see the category structure: the parent acts as the primary category, and the newly created category becomes the subcategory under it.
   *
   * Validation and consistency rules include:
   *
   * - The specified slug must be unique.
   * - If parent_category_id is provided, the parent/child relationship must satisfy the one-level nesting rule (no deeper nesting).
   *
   * After successful creation, the system makes the new category available for customer browsing immediately so that subsequent customer category list views reflect the latest category structure and text.
   *
   * Related operations:
   *
   * - Administrators can edit an existing category’s name/description, which updates what customers see in listings.
   * - Administrators can delete a category; deleting a category hides it from browsing and moves affected products to an uncategorized state.
   *
   * @param connection
   * @param body Creation payload for the category, including optional one-level nesting via parent_category_id.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification Implementation guidance for POST /categories.
   *
   * 1) Authorization
   * - Require admin actor authorization. Reject non-admin requests.
   *
   * 2) Input validation
   * - Validate name and description are present and meet any schema/business constraints.
   * - Validate slug is provided and normalized as a URL-safe identifier consistent with category routing expectations.
   * - Enforce uniqueness of slug using shopping_mall_categories @@unique([slug]).
   * - Validate display_order is provided and is an integer.
   * - Validate visibility is provided and corresponds to allowed visibility states (enforced by service/domain rules).
   * - If parent_category_id is provided:
   *   - Load the parent category by id from shopping_mall_categories.
   *   - Enforce the one-level nesting constraint: the created category must be at depth 2 at most (i.e., the parent must not itself be a child of another category for deeper nesting). Concretely, ensure parent_category.parent_category_id is null; if it is not null, reject.
   *
   * 3) Database transaction
   * - Start a transaction.
   * - Create a new shopping_mall_categories row with:
   *   - parent_category_id (nullable)
   *   - name, description, slug, visibility, display_order
   * - Set created_at/updated_at via database defaults or service logic as implemented.
   * - Commit the transaction.
   *
   * 4) Response
   * - Return the created category entity representation.
   *
   * 5) Error handling
   * - If slug already exists: return an application-level conflict/validation error.
   * - If parent_category_id does not exist: return not-found/validation error.
   * - If parent violates one-level nesting eligibility: return a validation error.
   *
   * 6) Side effects
   * - No background jobs are required for customer visibility; ensure subsequent reads will include the new category according to visibility.
   *
   * 7) Consistency with schema comments
   * - Ensure deleted_at is not set during creation; a newly created category must be treated as visible based on visibility and not marked deleted.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @AdminAuth()
    admin: AdminPayload,
    @TypedBody()
    body: IShoppingMallCategory.ICreate,
  ): Promise<IShoppingMallCategory> {
    try {
      return await postShoppingMallAdminCategories({
        admin,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered, paginated list of shopping mall categories for browsing purposes.
   *
   * This operation is used by the storefront to present category entries using the latest stored category fields: the human-readable `name` and `description`, together with the one-level parent/child structure supported by categories. The underlying category model allows an optional `parent_category_id` to represent that a category can be nested under exactly one parent, enabling one-level subcategory browsing.
   *
   * The system must ensure customer browsing remains consistent with administrator-managed category lifecycle rules. When an administrator edits the category `name` or `description`, those updated values must be reflected in the browsing results produced by this operation. When an administrator deletes a category, that category must be hidden from customer browsing, and products that were previously linked to the deleted category become uncategorized; therefore this operation must exclude records that are no longer visible.
   *
   * Authorization-wise, this endpoint only returns category data and does not modify any state. Only listing/browsing is performed, so callers must have permission to browse categories under their actor scope.
   *
   * Filtering/pagination expectations: the request body controls pagination and optional ordering/search fields, while the response returns a page of category summaries optimized for list rendering. For nesting, the response should preserve the one-level relationship by including parent/child placement information according to the schema relationship where `parent_category_id` is optional and `childCategories` is derived from it.
   *
   * Related operations: Administrators manage category creation, editing, and deletion through write operations (not covered here). Customers view categories through this listing operation, and then navigate into product browsing pages that use the selected category context.
   *
   * @param connection
   * @param body Search and pagination criteria for categories listing.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification Query shopping_mall_categories and return a
     *   paginated list of category summaries.
   *
   * 1) Parse requestBody criteria for pagination (page size, cursor/offset if supported by IShoppingMallCategory.IRequest) and optional filters (e.g., visibility, parent/slug/name search) as defined by the request DTO.
   * 2) Apply filtering to shopping_mall_categories:
   *    - Only include categories that are visible for browsing according to the `visibility` column.
   *    - Exclude categories with `deleted_at` set (category records treated as hidden).
   * 3) Apply sorting:
   *    - If request specifies an order, map it to allowed columns (e.g., display_order, updated_at, created_at).
   * 4) Build nesting context for one-level hierarchy:
   *    - Include parent category identifier (from `parent_category_id`) in each returned summary so clients can render primary/subcategory placement.
   *    - Do not attempt multi-level nesting beyond the one-level rule.
   * 5) Execute in a single read transaction (no writes).
   * 6) Return IPageIShoppingMallCategory.ISummary containing pagination metadata and the list of category summaries.
   *
   * Edge cases:
   * - If no categories match filters, return an empty page (pagination metadata should still be present).
   * - If parent/child composition is requested, ensure it does not imply deeper-than-one-level nesting.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @AdminAuth()
    admin: AdminPayload,
    @TypedBody()
    body: IShoppingMallCategory.IRequest,
  ): Promise<IPageIShoppingMallCategory.ISummary> {
    try {
      return await patchShoppingMallAdminCategories({
        admin,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single shopping mall category by its identifier for customer-facing browsing.
   *
   * This operation is intended for storefront and customer UI flows where the user selects a category link and needs the latest category name and description. Categories are created, edited, and removed by administrators only; customers are restricted to viewing category information and browsing products through the category grouping.
   *
   * The operation reads from `shopping_mall_categories`, which stores `name`, `description`, `slug`, `visibility`, and `display_order` along with timestamps. The category may be arranged with an optional one-level nesting relationship via `parent_category_id` to support primary/subcategory browsing.
   *
   * Behavior and visibility rules are aligned with administrative category lifecycle:
   * - If a category has been removed (record has `deleted_at` set), it must not be treated as browseable by customers.
   * - If the category is not meant to be displayed to customers according to its `visibility` value, it must not be returned for customer browsing.
   *
   * Authorization: this endpoint is a read operation for customer browsing. It must allow unauthenticated visitors and authenticated customers to view browseable category details, while write operations remain administrator-only.
   *
   * Related operations: this endpoint is typically used alongside a categories list endpoint (which returns multiple categories with the category/subcategory structure) so that the UI can show a list first and then fetch the detail for a selected category. After an administrator edits the category name/description, subsequent calls to this endpoint must reflect the latest stored values.
   *
   * @param connection
   * @param categoryId Target category identifier (UUID) to fetch a single category record.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification 1) Validate `categoryId` is a valid UUID. 2)
     *   Query `shopping_mall_categories` by `id = categoryId`. 3) Enforce
     *   browseability: - If `deleted_at` is not null, treat as not found
     *   (return 404). - Apply customer visibility rules based on `visibility`
     *   (only return if the stored visibility indicates it is browseable). 4)
     *   Return a single DTO mapped from the category row (id, name,
     *   description, slug, visibility, display_order, created_at, updated_at).
     *   5) If the category does not exist or is not browseable, return an error
     *   response indicating it cannot be found.
   *
   * No transaction is required for a pure read operation. Do not join products by default to keep this operation fast and to avoid leaking products that may be subject to separate visibility rules.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":categoryId")
  public async at(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("categoryId")
    categoryId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallCategory> {
    try {
      return await getShoppingMallAdminCategoriesCategoryId({
        admin,
        categoryId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing category’s customer-facing name and description.
   *
   * This endpoint is intended for administrators to correct or refine how a category is presented to customers in category browsing and category-scoped product listing. The category being updated is identified by the category’s primary key (shopping_mall_categories.id). The system applies the new stored name and description so that subsequent customer browsing uses the latest values.
   *
   * Authorization is required: only administrator accounts may perform category management actions (create/edit/delete). If a non-administrator attempts to update category name or description, the system must reject the request.
   *
   * In the underlying data model (shopping_mall_categories), the category has optional one-level nesting via parent_category_id. This update must not change the category’s parent-child placement rules; it should only update the selected customer-facing text fields while preserving the existing one-level subcategory structure.
   *
   * Validation and existence checks are required: if the provided categoryId does not correspond to an existing category record, the system must reject the update and make no category-related changes.
   *
   * Error handling should ensure the operation is atomic: either the category’s editable fields are updated successfully, or the category remains unchanged.
   *
   * Related operations:
   * - Administrators can manage category lifecycle via other category management endpoints (e.g., editing category placement is not allowed here; name/description edits only).
   * - Customers can browse the categories list using the customer categories browsing operation, which must reflect the updated name/description after a successful update.
   *
   * Expected behavior:
   * - After a successful update, the category will immediately be shown to customers with the new name and description.
   *
   * @param connection
   * @param categoryId Target category identifier (shopping_mall_categories.id).
   * @param body Updated category data. Only administrator-editable fields (e.g., name and description) are accepted; parent placement and other identifiers remain unchanged.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification Implementation steps: 1) Authorize caller as
     *   administrator (admin or super-admin grade per actor rules). Reject
     *   otherwise. 2) Validate path parameter categoryId is a UUID. 3) Load
     *   shopping_mall_categories by id = categoryId, ensuring the record
     *   exists. 4) If not found, return a not-found style domain error without
     *   applying changes. 5) Validate request payload fields intended for
     *   editing (e.g., name and description) according to category editing
     *   rules. - Apply only customer-facing fields; do not alter
     *   parent_category_id. - Preserve one-level nesting: do not change parent
     *   relationship during this operation. - slug uniqueness is not changed
     *   here; if the update DTO includes slug (it should not), ignore/reject.
     *   6) Run update in a transaction: - UPDATE shopping_mall_categories SET
     *   name = ?, description = ?, updated_at = NOW() WHERE id = ?; 7) Return
     *   the updated category entity mapped to IShoppingMallCategory. 8) Edge
     *   cases: - If the payload is identical to current values, still treat as
     *   success and return the current record. - If the category is
     *   hidden/controlled by visibility or deleted_at, still update the stored
     *   fields as an administrative edit (do not implement deletion here).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":categoryId")
  public async update(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("categoryId")
    categoryId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallCategory.IUpdate,
  ): Promise<IShoppingMallCategory> {
    try {
      return await putShoppingMallAdminCategoriesCategoryId({
        admin,
        categoryId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes a category from the platform’s customer browsing, and reassigns any products previously associated with that category to the platform’s uncategorized grouping.
   *
   * This operation is intended for administrator category management. When an administrator deletes an existing category, the system must hide that category from customer-facing category browsing immediately, ensuring customers no longer see the deleted category in category lists/pages.
   *
   * In addition, products that were previously assigned to the deleted category must remain visible under the platform’s product visibility rules, but they must no longer be treated as belonging to the deleted category. To achieve this, the association between the deleted category and those products must be removed or replaced with the uncategorized grouping.
   *
   * If the provided `categoryId` does not correspond to an existing category, the system must reject the request with an outcome equivalent to “category not found”, and it must avoid making any category/product-related changes.
   *
   * Authorization: only administrators are allowed to perform this action. Unauthorized requests must be rejected without database changes.
   *
   * @param connection
   * @param categoryId Identifier of the category to remove. Must be an existing `shopping_mall_categories.id` value.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification Implementation steps:
   *
   * 1) Authorization & actor context
   * - Ensure the requester is an administrator (per administrator-only category management rules).
   *
   * 2) Validate existence
   * - Query `shopping_mall_categories` by `id = categoryId`.
   * - If no row exists, return an error outcome equivalent to “category not found” and do not perform any write operations.
   *
   * 3) Remove from customer browsing
   * - Update the target category so it is no longer visible. Since the schema includes `deleted_at` and `visibility`, use the project’s existing policy for customer browsing availability:
   *   - Prefer setting `shopping_mall_categories.deleted_at` to the current timestamp.
   *   - If the product/category browsing uses `visibility`, set `visibility` appropriately so the category no longer appears in storefront listings.
   *
   * 4) Re-assign products to uncategorized
   * - Update all products where `shopping_mall_products.shopping_mall_category_id = category.id`.
   * - Set them to the uncategorized category grouping used by the system.
   *   - Because we only know that `shopping_mall_products.shopping_mall_category_id` is non-null from the schema, implementer must resolve the system’s uncategorized category record (e.g., via a lookup by a known slug/visibility policy or by a dedicated uncategorized category id) and set `shopping_mall_category_id` to that resolved category id.
   *
   * 5) Transactionality
   * - Perform steps (3) and (4) in a single database transaction so that customers never observe an inconsistent state where the category is hidden but products still reference it (or vice versa).
   *
   * 6) Return value
   * - Return the deleted category representation (as stored in `shopping_mall_categories`) after the updates, including identifiers and customer-facing fields required by the corresponding response DTO.
   *
   * Edge cases
   * - Large number of products: use batch update SQL.
   * - Concurrency: if multiple deletions race for the same category, the second request may observe the row already marked as removed; still keep the outcome idempotent by treating it as successful once the browsing-removal state is applied.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":categoryId")
  public async erase(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("categoryId")
    categoryId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteShoppingMallAdminCategoriesCategoryId({
        admin,
        categoryId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
