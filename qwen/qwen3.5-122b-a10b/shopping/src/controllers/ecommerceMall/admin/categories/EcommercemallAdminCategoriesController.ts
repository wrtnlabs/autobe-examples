import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IEcommerceMallCategory } from "../../../../api/structures/IEcommerceMallCategory";
import { AdminAuth } from "../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../decorators/payload/AdminPayload";
import { deleteEcommerceMallAdminCategoriesCategoryId } from "../../../../providers/deleteEcommerceMallAdminCategoriesCategoryId";
import { postEcommerceMallAdminCategories } from "../../../../providers/postEcommerceMallAdminCategories";
import { putEcommerceMallAdminCategoriesCategoryId } from "../../../../providers/putEcommerceMallAdminCategoriesCategoryId";

@Controller("/ecommerceMall/admin/categories")
export class EcommercemallAdminCategoriesController {
  /**
   * Create a new product category or subcategory on the e-commerce platform.
   *
   * This operation allows administrators to establish the hierarchical category structure that organizes products for customer browsing and navigation. Categories provide the foundation for product organization, filtering, and discovery throughout the platform.
   *
   * **Authorization Requirements**
   *
   * Only administrators have the authority to create categories. Regular customers and sellers are restricted from category management operations and will receive authorization errors if they attempt to create categories.
   *
   * **Category Hierarchy Rules**
   *
   * The platform supports a one-level nesting structure consisting of parent categories and subcategories only. When creating a parent category (top-level), omit the parent_id field. When creating a subcategory, specify the parent_id of an existing top-level category. Subcategories cannot be nested under other subcategories—the system will reject any attempt to create a subcategory under a parent that already has a parent.
   *
   * **Field Requirements**
   *
   * - **name**: Required. The category name must be unique across all categories (both parent and subcategories). This name is displayed to customers during product browsing and category navigation.
   * - **description**: Optional. Provides additional context about the category's purpose and the types of products it contains.
   * - **parent_id**: Optional. Specifies the parent category when creating a subcategory. Must reference an existing top-level category (a category without a parent).
   *
   * **Snapshot Creation**
   *
   * Upon successful category creation, the system automatically generates a category snapshot to maintain an immutable audit trail of the category's initial state. This snapshot preserves the category information for historical reference and dispute resolution.
   *
   * **Related Operations**
   *
   * - Use `PATCH /categories` to retrieve a paginated list of all categories with their hierarchical relationships
   * - Use `GET /categories/{categoryId}` to retrieve detailed information about a specific category
   * - Use `PUT /categories/{categoryId}` to update an existing category's name or description
   * - Use `DELETE /categories/{categoryId}` to remove a category (moves products to uncategorized status)
   * - Use `GET /categories/{categoryId}/snapshots` to view the audit trail of category modifications
   *
   * @param connection
   * @param body Category creation information including name, optional description, and optional parent category reference for subcategory creation
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification 1. Validate authorization: Verify the authenticated user has admin role. Reject with 403 Forbidden if not authorized.
   *
   * 2. Validate request body:
   *    - name: Required string, trim whitespace, validate non-empty, check uniqueness across all categories (including deleted ones for soft-delete safety)
   *    - description: Optional string, validate max length if specified
   *    - parent_id: Optional UUID string, validate format if provided
   *
   * 3. Parent category validation (if parent_id provided):
   *    - Query ecommerce_mall_categories table for the specified parent_id
   *    - Verify the parent category exists and is not deleted (deleted_at IS NULL)
   *    - Verify the parent is a top-level category (parent_id IS NULL)
   *    - Reject with 400 Bad Request if parent is itself a subcategory (enforce one-level nesting)
   *
   * 4. Create category record:
   *    - Generate UUID for id
   *    - Set name, description (null if not provided), parent_id (null if not provided)
   *    - Set created_at and updated_at to current timestamp (Asia/Seoul timezone)
   *    - Set deleted_at to null
   *
   * 5. Create category snapshot:
   *    - Generate snapshot record with snapshotType='category'
   *    - Store currentValues as JSON containing the complete category state
   *    - Set previousValues to empty JSON object (initial creation)
   *    - Record changedBy as the admin user's ID
   *    - Set createdAt to current timestamp
   *
   * 6. Return created category:
   *    - Include all fields: id, parent_id, name, description, created_at, updated_at, deleted_at
   *    - Return 201 Created status with category in response body
   *
   * 7. Error handling:
   *    - 401 Unauthorized: Missing or invalid authentication
   *    - 403 Forbidden: User is not an administrator
   *    - 400 Bad Request: Validation failures (duplicate name, invalid parent_id, parent is subcategory)
   *    - 404 Not Found: Specified parent category does not exist
   *    - 500 Internal Server Error: Database or snapshot creation failures
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @AdminAuth()
    admin: AdminPayload,
    @TypedBody()
    body: IEcommerceMallCategory.ICreate,
  ): Promise<IEcommerceMallCategory> {
    try {
      return await postEcommerceMallAdminCategories({
        admin,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing product category's name and description on the e-commerce platform.
   *
   * This operation allows administrators to modify category information to maintain accurate product organization and navigation. Only administrators have the authority to update categories; customers and sellers can only view categories.
   *
   * The operation requires the category ID as a path parameter and accepts updated name and description in the request body. Upon successful update, the system creates an immutable snapshot capturing the before and after state of the category for audit purposes.
   *
   * The category's updated_at timestamp is automatically set to the current time. Deleted categories cannot be updated through this operation.
   *
   * Related operations:
   * - `GET /categories/{categoryId}` - Retrieve detailed category information before updating
   * - `PATCH /categories` - List categories with filtering and pagination
   * - `DELETE /categories/{categoryId}` - Remove a category from the platform
   *
   * @param connection
   * @param categoryId Target category's unique identifier (UUID format)
   * @param body Category update information including name and description
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Update an existing category's name and description. Verify the requesting user is an administrator. Validate categoryId exists and is not deleted. Update name and description fields. Create a category snapshot capturing before/after values for audit trail. Update the updated_at timestamp. Return the updated category entity. Transaction: BEGIN → verify admin → fetch category → validate → update fields → create snapshot → commit → return entity.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":categoryId")
  public async update(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("categoryId")
    categoryId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IEcommerceMallCategory.IUpdate,
  ): Promise<IEcommerceMallCategory> {
    try {
      return await putEcommerceMallAdminCategoriesCategoryId({
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
   * Permanently remove a product category from the platform through soft deletion.
   *
   * This operation is exclusively available to administrators and performs a soft delete by setting the deleted_at timestamp on the category record. The category is removed from all customer-facing listings and navigation, but the record is preserved for historical reference in order snapshots and audit trails.
   *
   * When a category is deleted, all products assigned to that category become uncategorized. These products remain visible in search results and seller product listings but are excluded from category-based browsing. If the category has subcategories, the system prevents deletion unless all subcategories are deleted first or their products are reassigned.
   *
   * The system automatically creates a snapshot of the category state before deletion for audit purposes, capturing the complete category information including name, description, and hierarchical relationships.
   *
   * **Authorization**: Only administrators with appropriate permissions can execute this operation. Customers and sellers receive authorization errors when attempting category deletion.
   *
   * **Related Operations**: Before deleting a category, administrators should use `GET /categories/{categoryId}` to review category details and product assignments. Products can be reassigned to other categories using the product update operation if needed.
   *
   * @param connection
   * @param categoryId Unique identifier of the category to delete (UUID format)
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification 1. Validate administrator authorization - reject with 403 if caller is not admin
   * 2. Verify category exists - return 404 if not found
   * 3. Check for subcategories - if any subcategories exist, return 400 with error message requiring subcategory deletion first
   * 4. Query all products in this category (including products in subcategories if cascading)
   * 5. Create category snapshot with current state (name, description, parent_id, etc.)
   * 6. Update category deleted_at to current timestamp (soft delete)
   * 7. Update all products in category: set category_id to null (uncategorized)
   * 8. Commit transaction atomically
   * 9. Return 204 No Content on success
   *
   * Edge cases:
   * - Category with no products: proceed with deletion
   * - Category referenced in active order items: preserve category for historical snapshots, products become uncategorized
   * - Concurrent deletion attempts: use optimistic locking on updated_at
   * - Transaction rollback on any failure
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
      return await deleteEcommerceMallAdminCategoriesCategoryId({
        admin,
        categoryId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
