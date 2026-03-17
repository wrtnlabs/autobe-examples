import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IEcommerceMallCategory } from "../../../api/structures/IEcommerceMallCategory";
import { IPageIEcommerceMallCategory } from "../../../api/structures/IPageIEcommerceMallCategory";
import { getEcommerceMallCategoriesCategoryId } from "../../../providers/getEcommerceMallCategoriesCategoryId";
import { patchEcommerceMallCategories } from "../../../providers/patchEcommerceMallCategories";

@Controller("/ecommerceMall/categories")
export class EcommercemallCategoriesController {
  /**
   * Retrieve a filtered and paginated list of product categories from the e-commerce mall platform.
   *
   * This operation provides comprehensive category browsing capabilities for customers, sellers, and administrators. Categories organize products into a hierarchical structure supporting one level of nesting (parent categories and subcategories only), enabling efficient product discovery and filtering throughout the platform.
   *
   * **Access Control:**
   * - Customers and sellers can browse all active (non-deleted) categories for product navigation
   * - Administrators can view all categories including deleted ones, with optional filters to show/hide soft-deleted categories
   * - All actors can search, filter, and paginate through category listings
   *
   * **Category Structure:**
   * Categories support a two-level hierarchy where parent categories (parent_id = null) can have multiple subcategories, but subcategories cannot have children. This one-level nesting structure ensures simple navigation while providing organizational flexibility. Each category has a unique name across all categories and an optional description for additional context.
   *
   * **Search and Filtering:**
   * The operation supports filtering by category name (partial matching), parent category (to list subcategories of a specific parent), and deletion status (for administrators). Sorting options include creation date, name alphabetically, and last update time.
   *
   * **Related Operations:**
   * - `GET /ecommerceMall/categories/{categoryId}` - Retrieve detailed information for a specific category including its products
   * - `PATCH /ecommerceMall/products` - Search products with category filtering using categoryId parameter
   * - `POST /ecommerceMall/categories` - (Administrator only) Create a new parent category or subcategory
   * - `PUT /ecommerceMall/categories/{categoryId}` - (Administrator only) Update category name and description
   * - `DELETE /ecommerceMall/categories/{categoryId}` - (Administrator only) Soft-delete a category, moving products to uncategorized status
   *
   * @param connection
   * @param body Search criteria, filtering options, and pagination parameters for category listing
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Query ecommerce_mall_categories table with pagination and filtering logic.
   *
   * **Implementation Steps:**
   * 1. Build base query selecting from ecommerce_mall_categories
   * 2. Apply soft-delete filter: exclude records where deleted_at IS NOT NULL (for non-administrators)
   * 3. Apply name filter: if provided, perform case-insensitive partial matching on name column using LIKE or ILIKE
   * 4. Apply parent_id filter: if provided, return only subcategories of the specified parent category; if null, return only parent categories (parent_id IS NULL)
   * 5. Apply deletion status filter (administrators only): if showDeleted=true, include deleted categories; otherwise exclude them
   * 6. Apply sorting: default to created_at DESC (newest first), support name ASC/DESC, updated_at ASC/DESC
   * 7. Apply pagination: cursor-based or offset-based pagination with configurable page size (default 20, max 100)
   * 8. Join with products table if product count is requested in summary
   * 9. Return paginated result with IPageIEcommerceMallCategory.ISummary structure
   *
   * **Validation Rules:**
   * - Validate parent_id exists if provided (return 404 if parent category not found)
   * - Validate page size is within acceptable range (1-100)
   * - Validate cursor/offset is valid for pagination
   * - Validate sorting field is one of: created_at, updated_at, name
   *
   * **Performance Considerations:**
   * - Use indexes on created_at, parent_id, and name columns (already defined in schema)
   * - Consider caching category hierarchy for frequently accessed parent-subcategory relationships
   * - Implement query result caching for category listings with short TTL (5-10 minutes)
   *
   * **Edge Cases:**
   * - Empty category list: return empty data array with pagination metadata
   * - Category with no subcategories: parent_id filter returns empty array
   * - Deleted category referenced in parent_id filter: return 404 Not Found
   * - Very deep pagination: implement cursor-based pagination for better performance on large datasets
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody()
    body: IEcommerceMallCategory.IRequest,
  ): Promise<IPageIEcommerceMallCategory.ISummary> {
    try {
      return await patchEcommerceMallCategories({
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information about a specific product category by its unique identifier.
   *
   * This operation returns complete category details including the category name, description, hierarchical parent relationship (if applicable), and timestamps. Categories organize products into logical groups for customer browsing and filtering on the e-commerce platform.
   *
   * The category structure supports one level of nesting: parent categories can have subcategories, but subcategories cannot have children. When retrieving a subcategory, the parent_id field will reference its parent category. Top-level categories have a null parent_id.
   *
   * **Access Control**:
   * - Customers: Can view all active (non-deleted) categories for product browsing
   * - Sellers: Can view all active categories
   * - Administrators: Can view all categories including deleted ones for management purposes
   *
   * **Related Operations**:
   * - `GET /categories` - List all categories with hierarchical grouping
   * - `GET /categories/{categoryId}/products` - Retrieve products within a specific category
   * - `PATCH /categories` - (Admin only) Create new categories
   * - `PUT /categories/{categoryId}` - (Admin only) Update category information
   * - `DELETE /categories/{categoryId}` - (Admin only) Soft-delete a category
   *
   * **Soft Delete Behavior**:
   * Categories use soft deletion (deleted_at timestamp). Deleted categories are hidden from customer-facing views but remain accessible to administrators for audit and historical reference. Products previously assigned to deleted categories are moved to an uncategorized state.
   *
   * @param connection
   * @param categoryId Unique identifier of the target category (UUID format)
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Retrieve category by UUID from ecommerce_mall_categories table. Query should:
   *
   * 1. Accept categoryId as UUID path parameter
   * 2. Query the ecommerce_mall_categories table with WHERE id = :categoryId
   * 3. Include parent category relationship via LEFT JOIN on parent_id for hierarchical context
   * 4. Apply soft delete filtering based on actor type:
   *    - For customers/sellers: WHERE deleted_at IS NULL
   *    - For administrators: no deleted_at filter (show all)
   * 5. Return full category object including:
   *    - id (UUID)
   *    - parent_id (UUID or null)
   *    - name (string)
   *    - description (string or null)
   *    - created_at (timestamp)
   *    - updated_at (timestamp)
   *    - deleted_at (timestamp or null)
   * 6. If category not found or not accessible (deleted for non-admin), return 404 Not Found
   * 7. Validate categoryId format is valid UUID before database query
   * 8. Include parent category summary in response if parent_id exists
   *
   * Error handling:
   * - 400 Bad Request: Invalid UUID format in categoryId
   * - 404 Not Found: Category does not exist or is deleted (for non-admin users)
   * - 401 Unauthorized: User not authenticated
   * - 403 Forbidden: Insufficient permissions (should not occur for GET, but included for completeness)
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":categoryId")
  public async at(
    @TypedParam("categoryId")
    categoryId: string & tags.Format<"uuid">,
  ): Promise<IEcommerceMallCategory> {
    try {
      return await getEcommerceMallCategoriesCategoryId({
        categoryId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
