import { IConnection, HttpError } from "@nestia/fetcher";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia, { tags } from "typia";
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
 * @path /shoppingMall/platformAdmin/products/:productCode/categories
 * @accessor api.functional.shoppingMall.platformAdmin.products.categories.create
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
    path: "/shoppingMall/platformAdmin/products/:productCode/categories",
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
    `/shoppingMall/platformAdmin/products/${encodeURIComponent(props.productCode ?? "null")}/categories`;
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
 * @path /shoppingMall/platformAdmin/products/:productCode/categories
 * @accessor api.functional.shoppingMall.platformAdmin.products.categories.index
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
    path: "/shoppingMall/platformAdmin/products/:productCode/categories",
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
    `/shoppingMall/platformAdmin/products/${encodeURIComponent(props.productCode ?? "null")}/categories`;
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

/**
 * Update a row in shopping_mall_product_category_assignments for a given
 * product’s category assignment.
 *
 * Update metadata of an existing product–category assignment that links a
 * product to a category in the shoppingMall catalog.
 *
 * This operation works against the `shopping_mall_product_category_assignments`
 * Prisma model, whose purpose is to connect products from
 * `shopping_mall_products` with categories from `shopping_mall_categories`.
 * Each record in this table normally includes foreign keys referencing a
 * product row and a category row, along with descriptive or behavioral metadata
 * like `is_primary` flags, numeric `sort_order` values, and possibly additional
 * columns that control whether the product should appear in faceted navigation
 * or region-specific views for that category.
 *
 * The product is located using the `productCode` path parameter, which
 * represents a human-readable, globally unique business identifier for the
 * product rather than its internal id. Once the product is found, the
 * implementation must fetch the assignment row using
 * `productCategoryAssignmentId` from
 * `shopping_mall_product_category_assignments` and verify that this row’s
 * product foreign key matches the resolved product. If the product cannot be
 * found, or if the assignment does not belong to the specified product, the
 * service should respond with a not-found style error so that clients cannot
 * infer the existence of unrelated products or assignments.
 *
 * The request body is defined by
 * `IShoppingMallProductCategoryAssignment.IUpdate`. This DTO exposes only the
 * mutable fields from the underlying schema, such as primary/secondary flags,
 * ordering values, or optional activation windows. It does not allow changing
 * which product or category the assignment points to, as those are structural
 * identifiers controlled elsewhere in the system. Incoming values must be
 * validated against the Prisma schema: boolean fields must be true/false,
 * numeric ordering fields must fall within acceptable ranges, and any optional
 * fields must honor nullability rules.
 *
 * In terms of authorization, this endpoint is restricted to actors that are
 * allowed to curate the catalog. The `authorizationActors: ["platformAdmin"]`
 * setting reflects that only platform-level administrators, as modeled in
 * `shopping_mall_platformadmin`, can call this operation by default. The
 * service layer can further enforce finer-grained permissions, such as limiting
 * which products a given administrator may manage or logging changes to
 * `shopping_mall_admin_action_audits` for compliance.
 *
 * On success, the updated assignment is returned as
 * `IShoppingMallProductCategoryAssignment`, representing the latest state from
 * the database. Clients that manage product taxonomy can use this response to
 * update their UI state and may combine it with list endpoints that enumerate
 * all assignments for a given product or category. Related operations include
 * creating a new assignment for a product and deleting assignments that are no
 * longer needed when reorganizing the catalog.
 *
 * @param props.connection
 * @param props.productCode Unique business identifier code of the target
 *   product (global scope) whose category assignment should be updated.
 * @param props.productCategoryAssignmentId Unique identifier of the specific
 *   product–category assignment record within
 *   `shopping_mall_product_category_assignments` that belongs to the given
 *   product.
 * @param props.body Updatable fields for the existing product–category
 *   assignment associated with the specified product.
 * @path /shoppingMall/platformAdmin/products/:productCode/categories/:productCategoryAssignmentId
 * @accessor api.functional.shoppingMall.platformAdmin.products.categories.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<update.Response> {
  return true === connection.simulate
    ? update.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...update.METADATA,
          path: update.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace update {
  export type Props = {
    /**
     * Unique business identifier code of the target product (global scope)
     * whose category assignment should be updated.
     */
    productCode: string;

    /**
     * Unique identifier of the specific product–category assignment record
     * within `shopping_mall_product_category_assignments` that belongs to
     * the given product.
     */
    productCategoryAssignmentId: string & tags.Format<"uuid">;

    /**
     * Updatable fields for the existing product–category assignment
     * associated with the specified product.
     */
    body: IShoppingMallProductCategoryAssignment.IUpdate;
  };
  export type Body = IShoppingMallProductCategoryAssignment.IUpdate;
  export type Response = IShoppingMallProductCategoryAssignment;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/platformAdmin/products/:productCode/categories/:productCategoryAssignmentId",
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
    `/shoppingMall/platformAdmin/products/${encodeURIComponent(props.productCode ?? "null")}/categories/${encodeURIComponent(props.productCategoryAssignmentId ?? "null")}`;
  export const random = (): IShoppingMallProductCategoryAssignment =>
    typia.random<IShoppingMallProductCategoryAssignment>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("productCode")(() => typia.assert(props.productCode));
      assert.param("productCategoryAssignmentId")(() =>
        typia.assert(props.productCategoryAssignmentId),
      );
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
 * Delete a row from shopping_mall_product_category_assignments for a given
 * product’s category assignment.
 *
 * Delete a specific product–category assignment for a product, disconnecting
 * the product from one of its categories in the shoppingMall catalog.
 *
 * This operation manipulates the `shopping_mall_product_category_assignments`
 * Prisma model, which serves as the junction between `shopping_mall_products`
 * and `shopping_mall_categories`. Each record defines that a product is placed
 * into a particular category, often with additional metadata such as ordering
 * or flags indicating whether the assignment is active. By deleting such a
 * record, the system stops treating the product as a member of that category,
 * which directly affects category navigation, merchandising rules, and any
 * reporting that groups products by category.
 *
 * The request path uses the `productCode` parameter to identify the product row
 * in `shopping_mall_products` and `productCategoryAssignmentId` to locate the
 * exact assignment row in `shopping_mall_product_category_assignments`. The
 * implementation must ensure that the assignment belongs to the resolved
 * product before performing the deletion. If either the product cannot be found
 * by code or the assignment does not reference that product, the operation
 * should respond with a not-found style response and must not disclose whether
 * an assignment exists for some other product.
 *
 * From an authorization perspective, unlinking products from categories is a
 * sensitive catalog-management action. Therefore the endpoint is constrained to
 * platform-level administrative actors, represented here with
 * `authorizationActors: ["platformAdmin"]`. The business logic can also log
 * such changes to audit tables like `shopping_mall_admin_action_audits` so that
 * catalog changes remain traceable for compliance and operational review.
 *
 * On success, the assignment row is permanently removed from the database. The
 * operation does not return a response body; instead, it indicates successful
 * completion with the HTTP status code. Admin-facing clients can call this
 * endpoint when removing a category from a product’s assignment list and then
 * re-query the remaining assignments via a separate list endpoint to refresh
 * their display.
 *
 * @param props.connection
 * @param props.productCode Unique business identifier code of the target
 *   product (global scope) whose category assignment is being deleted.
 * @param props.productCategoryAssignmentId Unique identifier of the specific
 *   product–category assignment record within
 *   `shopping_mall_product_category_assignments` to delete for the given
 *   product.
 * @path /shoppingMall/platformAdmin/products/:productCode/categories/:productCategoryAssignmentId
 * @accessor api.functional.shoppingMall.platformAdmin.products.categories.erase
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function erase(
  connection: IConnection,
  props: erase.Props,
): Promise<void> {
  return true === connection.simulate
    ? erase.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...erase.METADATA,
          path: erase.path(props),
          status: null,
        },
      );
}
export namespace erase {
  export type Props = {
    /**
     * Unique business identifier code of the target product (global scope)
     * whose category assignment is being deleted.
     */
    productCode: string;

    /**
     * Unique identifier of the specific product–category assignment record
     * within `shopping_mall_product_category_assignments` to delete for the
     * given product.
     */
    productCategoryAssignmentId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/shoppingMall/platformAdmin/products/:productCode/categories/:productCategoryAssignmentId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/platformAdmin/products/${encodeURIComponent(props.productCode ?? "null")}/categories/${encodeURIComponent(props.productCategoryAssignmentId ?? "null")}`;
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: erase.Props,
  ): void => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: erase.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("productCode")(() => typia.assert(props.productCode));
      assert.param("productCategoryAssignmentId")(() =>
        typia.assert(props.productCategoryAssignmentId),
      );
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
