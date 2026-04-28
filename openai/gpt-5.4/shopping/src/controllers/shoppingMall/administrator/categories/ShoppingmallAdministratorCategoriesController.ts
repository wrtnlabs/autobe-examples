import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallCategory } from "../../../../api/structures/IPageIShoppingMallCategory";
import { IShoppingMallCategory } from "../../../../api/structures/IShoppingMallCategory";
import { AdministratorAuth } from "../../../../decorators/AdministratorAuth";
import { AdministratorPayload } from "../../../../decorators/payload/AdministratorPayload";
import { deleteShoppingMallAdministratorCategoriesCategoryId } from "../../../../providers/deleteShoppingMallAdministratorCategoriesCategoryId";
import { getShoppingMallAdministratorCategoriesCategoryId } from "../../../../providers/getShoppingMallAdministratorCategoriesCategoryId";
import { patchShoppingMallAdministratorCategories } from "../../../../providers/patchShoppingMallAdministratorCategories";
import { postShoppingMallAdministratorCategories } from "../../../../providers/postShoppingMallAdministratorCategories";
import { putShoppingMallAdministratorCategoriesCategoryId } from "../../../../providers/putShoppingMallAdministratorCategoriesCategoryId";

@Controller("/shoppingMall/administrator/categories")
export class ShoppingmallAdministratorCategoriesController {
  /**
   * Create a new catalog category or direct subcategory for product classification and storefront browsing.
   *
   * This operation allows an administrator to add a new active record to the category taxonomy stored in shopping_mall_categories, which is the table that holds the current catalog categories and subcategories used for administrative catalog management and customer browsing. The created record must include the category display name and the human-readable description that explains the category’s purpose and what kinds of products belong in it. A category may be created either as a top-level node or as a single-level child of another category by supplying the parent category identifier.
   *
   * Access to this operation is restricted to administrator-grade actors because the requirements state that category creation is an administrator-only capability. Customer and seller attempts to create categories must be rejected without changing the catalog structure. This endpoint is therefore part of the administrative oversight flow for categories described in the requirements, where administrators manage classification without altering product ownership relationships.
   *
   * The hierarchy behavior must follow the rules of shopping_mall_categories.parent_id and the business constraints on category nesting. When parent_id is omitted, the system creates a top-level category. When parent_id is provided, the referenced parent category must exist and must itself be a top-level category, because the catalog supports only one parent-child level. Any request that would place a new category under an existing subcategory must be rejected so that displayed relationships remain limited to parent categories and their direct subcategories only.
   *
   * The system must also enforce the live table constraints of the category model. The category name is required for administrative management and customer browsing, and the description is required as the explanation of the grouping’s business meaning. Because the table defines a unique constraint on the pair of parent_id and name, the system must reject attempts to create two sibling categories with the same name under the same parent scope. This permits the same name only when it appears under different parent scopes or under a different top-level placement if that remains valid under the composite uniqueness rule.
   *
   * A successfully created category becomes available for later category browsing and for product assignment in product management flows. Consumers that need to inspect the overall taxonomy after creation typically use the category listing or detail retrieval operations to observe the newly inserted node within the current hierarchy. Error handling should clearly distinguish authorization failure, missing parent category, invalid parent depth, and duplicate sibling-name conflicts.
   *
   * @param connection
   * @param body Creation data for a top-level category or subcategory
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor administrator
     * @x-autobe-specification Implement an administrator-only create service
     *   for shopping_mall_categories.
   *
   * Authorize the caller as an administrator or superAdministrator before any write logic. If the caller is a customer or seller, reject the request and do not create any partial record.
   *
   * Validate the request body fields against the category business rules and schema-backed structure. Require name and description as non-empty values suitable for catalog presentation. Accept an optional parentId field that maps to shopping_mall_categories.parent_id.
   *
   * If parentId is null or absent, create a top-level category. If parentId is provided, query shopping_mall_categories for an active parent row with matching id and deleted_at null. Reject the request if the parent does not exist or is not active. Then verify that the parent row itself has parent_id null. If the parent already has its own parent_id, reject the request because category nesting may not exceed one level.
   *
   * Before insert, check for an existing active sibling category with the same name under the same parent scope. For top-level creation, compare rows where parent_id is null and deleted_at is null. For subcategory creation, compare rows where parent_id equals the requested parentId and deleted_at is null. If a conflicting sibling exists, reject the request as a duplicate category name within the same scope.
   *
   * Insert a new shopping_mall_categories row with a generated UUID id, the resolved parent_id value, the submitted name and description, and current timestamps for created_at and updated_at. Set deleted_at to null. Return the created row as the response payload.
   *
   * Within the same transaction, append a shopping_mall_category_snapshots audit row describing the creation event. Populate shopping_mall_category_id with the new category id, set change_summary to a creation-oriented summary, set before_value to a textual empty or not-applicable state, and set after_value to a textual representation of the new category name, description, and hierarchy placement. This preserves the immutable audit history expected for category changes.
   *
   * Handle edge cases explicitly: reject non-administrator actors, reject inactive or missing parent categories, reject parent categories that are already subcategories, reject duplicate sibling names, and surface persistence failures without leaving orphaned snapshot data or partial category creation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @AdministratorAuth()
    administrator: AdministratorPayload,
    @TypedBody()
    body: IShoppingMallCategory.ICreate,
  ): Promise<IShoppingMallCategory> {
    try {
      return await postShoppingMallAdministratorCategories({
        administrator,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of catalog categories.
   *
   * This operation returns category records that define the marketplace catalog structure used to organize products for browsing and classification. In the business model, a category is the classification unit that can represent either a top-level category or a direct subcategory, and the platform explicitly limits this hierarchy to one level of nesting. The response is intended for category browsing views, administrative lookup screens, and seller-facing product classification flows where current active category information must be presented in a structured and searchable form.
   *
   * The category structure described by the requirements is business-facing rather than purely technical. Customers use categories as the structure for locating products, sellers rely on the same structure when assigning products to the catalog, and administrators maintain the definitions over time. Each category is defined by required name and description values, and products assigned directly to a category are considered part of that browsing path. If a category has previously been removed from active use, affected products are treated as uncategorized rather than invalid, so this list operation is concerned with active category browsing data rather than historical deletion events.
   *
   * Access to this endpoint is broader than category management permissions. The loaded requirements restrict create, edit, and delete actions to administrators, but they also describe categories as a shared browsing and classification structure used across the marketplace. For that reason, authenticated customers, sellers, administrators, and super administrators may use this operation to retrieve category information appropriate for search screens, navigation trees, and product assignment interfaces. The operation itself does not perform category modification and does not alter hierarchy relationships.
   *
   * Clients may use this endpoint together with category detail retrieval or product-listing operations. A client can first execute this collection query to locate relevant top-level categories or subcategories, then use selected category identifiers in downstream product browsing or category detail views. When presenting hierarchy-aware user interfaces, clients should treat the returned data according to the one-level parent and direct-subcategory structure required by the business rules.
   *
   * Expected behavior follows the catalog rules defined in the requirements. Queries may filter or sort the category collection, but the service must preserve the valid browsing structure and must not expose deeper nesting as if it were supported. Errors should be returned when the request body is malformed or when the actor is not authenticated according to system access rules, while successful responses should provide paginated category summaries optimized for list presentation.
   *
   * @param connection
   * @param body Category search filters and pagination options
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor administrator
     * @x-autobe-specification Implement this operation as a paginated category
     *   search over the shopping mall category aggregate.
   *
   * Load category records from the category source representing the active catalog structure. Build a query that supports common list-browsing inputs from IShoppingMallCategory.IRequest, including pagination, free-text search against category name and description, optional filtering by hierarchy role such as top-level category versus subcategory, optional filtering by parent category presence or specific parent category identifier, and explicit sorting for stable list presentation. Return the result as IPageIShoppingMallCategory.ISummary.
   *
   * Enforce authentication and allow customer, seller, administrator, and superAdministrator actors. Do not apply the administrator-only restriction used for category creation, update, or deletion, because this endpoint is for retrieval of the browsing and classification structure rather than management. If the caller is unauthenticated or otherwise blocked by global access policy, reject the request before querying the database.
   *
   * Represent hierarchy consistently with the business rule that category nesting is limited to one level. The query layer may join a parent category reference for summary enrichment, but it must not construct or advertise deeper recursive trees. If a filter requests subcategories, return only categories that belong directly to a top-level parent. If a filter requests top-level categories, return only categories without a parent.
   *
   * Exclude categories that are no longer part of active category browsing if the persistence model distinguishes active versus removed records. If the persistence model instead permanently removes deleted categories, the query naturally returns only remaining rows. Do not reclassify products in this endpoint; product uncategorized handling belongs to category deletion workflows, but this endpoint should reflect the current active classification state seen by browsing and product-assignment features.
   *
   * Validate request pagination and sorting inputs defensively. Apply deterministic ordering when client input is absent, preferably by hierarchy role and then category name or creation order if such fields exist in the schema. Return an empty page rather than an error when no categories match the filters. Use efficient count plus page queries or equivalent pagination strategy suitable for catalog browsing workloads.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @AdministratorAuth()
    administrator: AdministratorPayload,
    @TypedBody()
    body: IShoppingMallCategory.IRequest,
  ): Promise<IPageIShoppingMallCategory.ISummary> {
    try {
      return await patchShoppingMallAdministratorCategories({
        administrator,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the current detail of a single catalog category identified by its unique category ID.
   *
   * This operation returns the active category record used by the shopping mall catalog structure for storefront browsing and administrative catalog management. In the underlying shopping_mall_categories table, a category represents the current editable classification state for products, with a display name used in administrative management and customer browsing, and a human-readable description explaining the purpose of the category and what kinds of products belong in it. The response is intended to provide the present category identity that users and administrative clients need when opening a specific category detail view.
   *
   * The category model supports a self-referential hierarchy in which a record may be either a top-level category or a one-level child of another category through parent_id. As described in the requirements, the platform allows parent categories and their direct subcategories only, and rejects deeper nesting. Accordingly, this endpoint returns the category in its current valid hierarchy position so that clients can determine whether the category stands alone at the top level or participates as a direct subcategory within the catalog browsing structure.
   *
   * This endpoint is relevant to customer browsing flows because customers can open the category catalog, view category names and descriptions, and select a category or subcategory to continue into a product view. It is also useful to sellers and administrators in product-classification and catalog-maintenance contexts, because category details remain visible after edits and continue to define how products are organized without requiring associated products to be recreated. If a client needs the broader catalog structure or sibling categories, it should first use the category list endpoint rather than repeatedly calling this detail endpoint for discovery.
   *
   * The operation reads from the current category table rather than the category snapshot history table. That means it returns the latest active state of the category, including its current name, description, and hierarchy linkage. Records marked by deleted_at should not be exposed as normal active catalog entries in browsing flows. When the requested category does not exist or is no longer active, the implementation should fail with a not-found style error instead of returning stale or reconstructed historical data.
   *
   * Because categories are foundational to catalog organization and product assignment, callers should treat this endpoint as a read-only lookup of current classification metadata. It does not change hierarchy, rename categories, or move products. Those behaviors belong to dedicated maintenance operations. This operation is therefore best used together with category browsing and category maintenance APIs when a client needs both the wider catalog structure and the detail of one selected category.
   *
   * @param connection
   * @param categoryId Unique identifier of the target category
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor administrator
     * @x-autobe-specification Implement a read-only service that selects one
     *   record from shopping_mall_categories by id where deleted_at is null.
   *
   * Validate that the categoryId path parameter is a syntactically valid UUID before querying. Execute a single-category lookup against the current category table. The base query should load the category's id, parent_id, name, description, created_at, and updated_at. Include parent relationship data only if the IShoppingMallCategory DTO requires it, but do not attempt to recursively materialize unlimited descendants because the business rule allows only one level of nesting.
   *
   * If no active category matches the provided id, return a not-found error. Do not fall back to shopping_mall_category_snapshots for this endpoint, because this operation is defined to expose the current editable category state rather than historical audit history. If the record exists but deleted_at is not null, treat it as unavailable for normal retrieval.
   *
   * Map the database result into the IShoppingMallCategory DTO using the ShoppingMall service prefix naming convention. Preserve the current hierarchy linkage through parent_id or nested parent data according to the DTO definition. Ensure the response reflects the category as a current browsing and classification resource, not as a product aggregate.
   *
   * Authorization should permit actors that legitimately read category data in the application context: customers for category browsing, sellers for product-classification reference, and administrators or super administrators for oversight and maintenance views. The handler performs no mutation, no transaction is required beyond the consistent read, and no side effects or snapshot creation should occur.
   *
   * For error handling, return a validation error for malformed UUID input and a not-found error for missing or inactive categories. Preserve internal database details from leaking into the external response.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":categoryId")
  public async at(
    @AdministratorAuth()
    administrator: AdministratorPayload,
    @TypedParam("categoryId")
    categoryId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallCategory> {
    try {
      return await getShoppingMallAdministratorCategoriesCategoryId({
        administrator,
        categoryId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing catalog category used for product classification and storefront browsing.
   *
   * This operation lets an administrator maintain the current state of a category record stored in `shopping_mall_categories`, which is the active taxonomy for administrative catalog management and customer-facing catalog browsing. The category's display name represents the primary business label used to recognize the classification, and the category description explains the intended scope and meaning of the grouping. Updating these fields keeps the catalog understandable and current without recreating the category or reassigning products through a separate workflow.
   *
   * The category entity may be either a top-level category or a single-level child category through the self-referential `parent_id` relationship. The platform uses categories to organize products for browsing and classification, and customers are shown parent categories together with their direct subcategories when navigating the catalog. Because the business rules allow only one level of nesting, this operation must preserve that structure by rejecting any update that would place a category under another category that is already a subcategory. When an invalid hierarchy change is attempted, the existing valid relationships must remain unchanged.
   *
   * Access to this endpoint is restricted to administrative actors. Customers and sellers are not allowed to create, edit, or delete categories, and any such request must be rejected without creating a partial change. Authorized administrators can update category details for both top-level categories and subcategories, and the saved result becomes visible in later category browsing and product classification contexts.
   *
   * From a data perspective, this operation updates the current record in `shopping_mall_categories`, whose persisted fields include `id`, `parent_id`, `name`, `description`, `created_at`, `updated_at`, and `deleted_at`. The category name is required as the display name used in browsing and management, and the category description is required as the human-readable explanation of what kinds of products belong in the category. Implementations should also ensure that a category marked by `deleted_at` is not treated as an actively maintainable browsing category unless platform policy explicitly restores it through another operation.
   *
   * This endpoint is typically used together with category browsing and category detail retrieval flows. Administrative clients commonly load the current category first, present its existing name, description, and hierarchy placement to the administrator, and then submit the edited values to this endpoint. After a successful update, clients should refresh category lists or detail views so that customer-facing navigation and seller product classification interfaces reflect the revised category information.
   *
   * @param connection
   * @param categoryId UUID of the category to update
   * @param body Replacement values for the target category
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor administrator
     * @x-autobe-specification 1. Authorize the caller and allow only
     *   administrator-grade actors to execute the update. Reject customer and
     *   seller actors before any write logic begins. 2. Load the target row
     *   from `shopping_mall_categories` by `id = categoryId`. Treat the
     *   identifier as a UUID. If no active record exists, return a not-found
     *   error. The implementation should normally exclude rows whose
     *   `deleted_at` is not null from editable category maintenance. 3.
     *   Validate the request body against the update DTO. Require the mutable
     *   business fields needed for a full update, specifically category `name`,
     *   category `description`, and hierarchy placement if `parentId` is part
     *   of the DTO design. 4. If the request assigns or changes a parent
     *   category: - Load the proposed parent category. - Reject the update if
     *   the proposed parent does not exist or is inactive. - Reject the update
     *   if the proposed parent itself has a non-null `parent_id`, because
     *   category nesting is limited to one level only. - Reject self-parenting
     *   and any equivalent invalid self-reference. 5. Enforce uniqueness of the
     *   category name within the same parent scope according to the schema
     *   constraint `@@unique([parent_id, name])`. For top-level categories,
     *   uniqueness is within the null-parent scope. For subcategories,
     *   uniqueness is within the same parent category. 6. Persist the updated
     *   values to `shopping_mall_categories`, updating `name`, `description`,
     *   `parent_id` as allowed by the DTO, and refreshing `updated_at` to the
     *   current timestamp. Do not alter immutable identity fields such as `id`
     *   or creation metadata such as `created_at`. 7. Perform the write in a
     *   transaction if parent validation and uniqueness checks are separated
     *   from the final update, so invalid concurrent updates cannot create an
     *   inconsistent hierarchy state. 8. Return the updated category entity as
     *   the response payload. 9. Error handling: - Not found when the target
     *   category does not exist as an active record. - Forbidden when the
     *   caller is not an administrator-authorized actor. - Conflict or
     *   validation failure when the requested name duplicates another category
     *   within the same parent scope. - Validation failure when the requested
     *   hierarchy would create more than one parent-child level or otherwise
     *   violate one-level nesting rules. 10. Side effects: after successful
     *   commit, downstream readers of category browsing and product
     *   classification should observe the updated category name, description,
     *   and valid hierarchy placement.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":categoryId")
  public async update(
    @AdministratorAuth()
    administrator: AdministratorPayload,
    @TypedParam("categoryId")
    categoryId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallCategory.IUpdate,
  ): Promise<IShoppingMallCategory> {
    try {
      return await putShoppingMallAdministratorCategoriesCategoryId({
        administrator,
        categoryId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently remove a catalog category and reclassify its affected products as uncategorized.
   *
   * This operation lets an administrator remove an existing category from the active catalog structure maintained in the shopping mall system. The underlying category entity is the catalog classification record used for storefront browsing and administrative catalog management, and the business requirements distinguish both top-level categories and one-level subcategories as valid deletion targets. When the category is removed, it must disappear from active category browsing so that customers no longer see it in the navigable category structure.
   *
   * Access to this operation is restricted to platform governance actors. The loaded requirements explicitly state that category create, edit, and delete actions are administrator-only, and that requests from customers or sellers must be rejected without producing any partial category change. Super administrators also have platform-wide oversight and therefore can be authorized consistently with administrative governance rules.
   *
   * The business effect of deletion extends beyond the category record itself. Requirements specify that products assigned to the deleted category are not removed from the platform solely because their classification was removed. Instead, products previously classified under either a deleted top-level category or a deleted subcategory must become uncategorized. This preserves catalog continuity for product records while removing the deleted category from category-based browsing. In practice, this means the deletion operation must coordinate category removal with reassignment of related product records so that product availability is preserved wherever uncategorized products are supported.
   *
   * Clients typically use category listing or category detail retrieval operations before invoking this endpoint in order to identify the target category. After this operation completes, subsequent category browsing operations should no longer include the removed category, and product browsing operations should reflect that previously assigned products no longer belong to that category. If the caller is not an authorized administrator-level actor, the request must be rejected and the existing category structure must remain unchanged.
   *
   * @param connection
   * @param categoryId Identifier of the category to remove from the catalog structure
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor administrator
     * @x-autobe-specification Implement this operation as an
     *   administrator-governed category removal workflow for the
     *   shopping_mall_categories entity.
   *
   * 1. Authorize the caller and allow only administrator and superAdministrator actors. If the actor is a customer or seller, reject the request before any database mutation and ensure no partial category or product changes occur.
   *
   * 2. Load the target category by categoryId from shopping_mall_categories. If no category exists for the supplied identifier, return a not-found error.
   *
   * 3. In a single database transaction, update all products currently assigned to the target category so that their category reference becomes null or the uncategorized state defined by the data model. This reassignment step is mandatory for both top-level categories and subcategories.
   *
   * 4. Delete the target category record from shopping_mall_categories after dependent product reassignment has succeeded. Ensure the removed category no longer appears in active category browsing.
   *
   * 5. Commit the transaction only if both product reclassification and category deletion succeed. On any failure, roll back the entire transaction so products are not left in a partially reclassified state.
   *
   * 6. Return successful completion with no response body.
   *
   * Implementation notes: do not delete products as part of this operation solely because they referenced the category. Preserve all affected product records. Error handling should include unauthorized actor rejection, target category not found, and transactional failure during product reassignment or category removal. Subsequent category index and detail operations must no longer expose the deleted category, and subsequent product retrieval must reflect uncategorized assignment for affected products.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":categoryId")
  public async erase(
    @AdministratorAuth()
    administrator: AdministratorPayload,
    @TypedParam("categoryId")
    categoryId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteShoppingMallAdministratorCategoriesCategoryId({
        administrator,
        categoryId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
