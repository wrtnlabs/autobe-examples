import { IConnection, HttpError } from "@nestia/fetcher";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia from "typia";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";

import { IShoppingMallProductCategoryAssignment } from "../../../../../structures/IShoppingMallProductCategoryAssignment";
import { IPageIShoppingMallProductCategoryAssignment } from "../../../../../structures/IPageIShoppingMallProductCategoryAssignment";

/**
 * Create or update a shopping_mall_product_category_assignments record for the
 * product identified by product code.
 *
 * Create or update category assignment records for a product identified by its
 * business `code`, using the `shopping_mall_product_category_assignments`
 * junction table as the persistence layer.
 *
 * The `shopping_mall_product_category_assignments` model is described in the
 * Prisma schema as a junction table linking products to categories. It contains
 * foreign key fields `shopping_mall_product_id` (referencing
 * `shopping_mall_products.id`) and `shopping_mall_category_id` (referencing
 * `shopping_mall_categories.id`), a boolean field `is_primary` that marks
 * whether this association is the primary category for the product, and
 * `created_at` / `updated_at` timestamps recording lifecycle events. A unique
 * index on `[shopping_mall_product_id, shopping_mall_category_id]` ensures that
 * there can be at most one assignment per product–category pair, preventing
 * duplicate category placements.
 *
 * The `shopping_mall_products` table provides the product context. Its `code`
 * field is a unique, business-visible identifier per platform, making it ideal
 * for use in URL path parameters. Other fields such as `name`, `status`,
 * `is_multi_sku`, `primary_image_uri`, and the lifecycle timestamps determine
 * how and whether the product appears in the public catalog. Although this
 * endpoint does not directly modify those fields, the existence and current
 * state of the product (including whether `deleted_at` is null) are relevant
 * when deciding if category assignments may be created or updated; for example,
 * some business rules might prevent new assignments for discontinued or
 * logically deleted products.
 *
 * The `shopping_mall_categories` model defines the available categories to
 * which products can be assigned. Fields like `code`, `slug`, `name`,
 * `display_order`, `is_leaf`, `active`, and `deleted_at` determine navigational
 * and merchandising behavior. When processing an
 * `IShoppingMallProductCategoryAssignment.ICreate` payload, the service must
 * verify that any referenced category IDs or codes correspond to valid,
 * non-deleted categories, and may optionally require that categories be active
 * or leaf nodes, depending on catalog policies.
 *
 * The request body type `IShoppingMallProductCategoryAssignment.ICreate`
 * encapsulates the data needed to create or adjust assignments. At a minimum,
 * it identifies the target category (or categories) and whether the new or
 * updated assignment should be primary by setting `is_primary`. If an
 * assignment already exists for the given product and category, the
 * implementation should update it rather than creating a duplicate, adjusting
 * `is_primary` and `updated_at` appropriately. When marking a new primary
 * category, the service must clear the `is_primary` flag on any existing
 * assignment for the same product, ensuring the constraint of “only one primary
 * category per product” is upheld at the business logic level.
 *
 * From a security and permissions perspective, this endpoint is restricted to
 * authenticated actors with catalog management responsibilities. The
 * `authorizationActors` list contains `"seller"` and `"platformAdmin"`,
 * signaling that both sellers and platform administrators may invoke it. Seller
 * requests must be checked against the product’s `shopping_mall_seller_id` to
 * ensure that only the owning merchant can manage assignments for their own
 * products, while platform admins may typically manage assignments across all
 * products for curation and moderation purposes. Unauthorized attempts—such as
 * a seller trying to modify assignments for another seller’s product—should
 * result in appropriate authorization errors.
 *
 * This endpoint works hand in hand with the read-only operation `PATCH
 * /products/{productCode}/categories`. UIs will typically first fetch existing
 * assignments via the PATCH endpoint to show the current mapping, then call
 * this POST endpoint to create new assignments, switch the primary category, or
 * add secondary categories. Error conditions include missing or invalid
 * `productCode`, use of non-existent or inactive categories, violation of
 * uniqueness assumptions in the DTO (for example, duplicate categories in the
 * request), and authorization failures. Successful responses return the
 * resulting `IShoppingMallProductCategoryAssignment` entity, including
 * identifiers and primary/secondary status, so clients can update their local
 * state promptly.
 *
 * @param props.connection
 * @param props.productCode Unique business-visible product code of the target
 *   product (global scope), matching `shopping_mall_products.code` and
 *   determining which product’s category assignments are being modified.
 * @param props.body Payload describing the desired category assignment for the
 *   specified product, including which category to link and whether this link
 *   should be primary.
 * @path /shoppingMall/seller/products/:productCode/categories
 * @accessor api.functional.shoppingMall.seller.products.categories.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<create.Response> {
  return true === connection.simulate
    ? create.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...create.METADATA,
          path: create.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Unique business-visible product code of the target product (global
     * scope), matching `shopping_mall_products.code` and determining which
     * product’s category assignments are being modified.
     */
    productCode: string;

    /**
     * Payload describing the desired category assignment for the specified
     * product, including which category to link and whether this link
     * should be primary.
     */
    body: IShoppingMallProductCategoryAssignment.ICreate;
  };
  export type Body = IShoppingMallProductCategoryAssignment.ICreate;
  export type Response = IShoppingMallProductCategoryAssignment;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/seller/products/:productCode/categories",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/shoppingMall/seller/products/${encodeURIComponent(props.productCode ?? "null")}/categories`;
  export const random = (): IShoppingMallProductCategoryAssignment =>
    typia.random<IShoppingMallProductCategoryAssignment>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("productCode")(() => typia.assert(props.productCode));
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Search and list shopping_mall_product_category_assignments for a specific
 * product identified by product code.
 *
 * Retrieve a paginated, filterable list of category assignments for a specific
 * product, using the product’s business `code` and the
 * `shopping_mall_product_category_assignments` junction table as the primary
 * data source.
 *
 * The `shopping_mall_product_category_assignments` Prisma model is explicitly
 * documented as a junction table linking products to categories in the catalog
 * hierarchy. Each record references a product via `shopping_mall_product_id`
 * (foreign key to `shopping_mall_products.id`) and a category via
 * `shopping_mall_category_id` (foreign key to `shopping_mall_categories.id`).
 * The schema notes that the `is_primary` boolean column indicates whether this
 * category is considered the primary category for the associated product.
 * Timestamps `created_at` and `updated_at` provide clear auditability for when
 * the association was created and last modified, and a unique index over
 * `[shopping_mall_product_id, shopping_mall_category_id]` ensures that the same
 * product–category pair is not assigned multiple times.
 *
 * The related `shopping_mall_products` model defines core product information,
 * including a `code` string field described as a business-visible product code
 * or identifier that is unique at the platform level and suited for stable
 * references in URLs and integrations. Other product fields include `name`,
 * `short_description`, `description`, lifecycle `status`, an `is_multi_sku`
 * flag, optional `primary_image_uri`, optional `additional_data` for JSON-like
 * metadata, and lifecycle timestamps `created_at`, `updated_at`, and optional
 * `deleted_at` for soft deletion semantics. Because of the unique index on
 * `code`, the path parameter `{productCode}` can safely be used to identify a
 * single `shopping_mall_products` row without ambiguity.
 *
 * The `shopping_mall_categories` model represents category nodes in a category
 * tree, with fields such as `code`, `slug`, `name`, `description`,
 * `display_order`, `is_leaf`, `active`, and timestamps including `deleted_at`
 * for logical removal. It has foreign keys to `shopping_mall_category_trees`
 * and a self-referencing `parent_id` for hierarchical structures. Although this
 * operation does not directly update categories, it typically joins categories
 * to enrich assignment results with category names, slugs, and display ordering
 * information.
 *
 * From a business perspective, this endpoint supports use cases where sellers
 * or administrators need to inspect how a given product is mapped into the
 * catalog taxonomy. For example, a seller dashboard may allow the seller to
 * open a product detail view and then list all categories under which the
 * product appears, optionally filtering to primary assignments only. An admin
 * console might use the same endpoint to review whether category placement
 * complies with merchandising rules, category activity, and policy
 * configurations.
 *
 * The request body type `IShoppingMallProductCategoryAssignment.IRequest` is
 * expected to carry pagination controls (such as page number and page size),
 * sorting options (e.g., by `created_at`, `display_order`, or `is_primary`),
 * and filter criteria like `isPrimaryOnly`, `categoryTreeId`, or `activeOnly`.
 * Implementation should translate these into WHERE and ORDER BY clauses against
 * `shopping_mall_product_category_assignments` joined to
 * `shopping_mall_categories`, always constrained by the product resolved from
 * `productCode`. When the `productCode` does not map to any product, the API
 * returns a not-found error; if the caller supplies invalid pagination
 * parameters, a validation error is returned.
 *
 * Regarding security, this endpoint is primarily intended for authenticated
 * business users: sellers managing their own catalog and platform-level
 * administrators curating the overall taxonomy. Accordingly, the
 * `authorizationActors` field lists `"seller"` and `"platformAdmin"`. The
 * actual authorization logic in the service layer must verify that a seller
 * only accesses assignments for products whose `shopping_mall_seller_id`
 * matches their identity, while a platform admin can typically access all
 * products. No public or guest access is allowed because category assignments
 * expose sensitive configuration about catalog structure and may reveal
 * internal merchandising strategies.
 *
 * This operation is typically used alongside the POST
 * `/products/{productCode}/categories` endpoint, which creates or adjusts
 * category assignments. A standard workflow is to call this PATCH endpoint to
 * show current assignments, then call POST to add new categories or change the
 * primary category. Errors may occur when the product is missing, the caller is
 * unauthorized, or filters are inconsistent with the schema (for example,
 * supplying incompatible sort fields).
 *
 * @param props.connection
 * @param props.productCode Unique business-visible product code of the target
 *   product (global scope), corresponding to `shopping_mall_products.code`.
 *   This value identifies which product’s category assignments will be listed.
 * @param props.body Search filters, pagination, and sorting instructions for
 *   listing category assignments attached to the specified product code.
 * @path /shoppingMall/seller/products/:productCode/categories
 * @accessor api.functional.shoppingMall.seller.products.categories.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...index.METADATA,
          path: index.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Unique business-visible product code of the target product (global
     * scope), corresponding to `shopping_mall_products.code`. This value
     * identifies which product’s category assignments will be listed.
     */
    productCode: string;

    /**
     * Search filters, pagination, and sorting instructions for listing
     * category assignments attached to the specified product code.
     */
    body: IShoppingMallProductCategoryAssignment.IRequest;
  };
  export type Body = IShoppingMallProductCategoryAssignment.IRequest;
  export type Response = IPageIShoppingMallProductCategoryAssignment.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/seller/products/:productCode/categories",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/shoppingMall/seller/products/${encodeURIComponent(props.productCode ?? "null")}/categories`;
  export const random =
    (): IPageIShoppingMallProductCategoryAssignment.ISummary =>
      typia.random<IPageIShoppingMallProductCategoryAssignment.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("productCode")(() => typia.assert(props.productCode));
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
