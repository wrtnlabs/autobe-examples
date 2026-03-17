import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallProductVariant } from "../../../../../structures/IPageIShoppingMallProductVariant";
import { IShoppingMallProductVariant } from "../../../../../structures/IShoppingMallProductVariant";

export * as inventory_records from "./inventory_records/index";
export * as snapshots from "./snapshots/index";

/**
 * Create a new purchasable product variant under a seller-owned product.
 *
 * This operation allows an authenticated seller to add a new variant to an existing product in the seller's own catalog. In the underlying data model, the parent shopping_mall_products record represents the seller-owned product listing that stores the current merchandise identity, current category assignment, current base price, and lifecycle status used for listing visibility and operational availability. The created child shopping_mall_product_variants record represents a purchasable SKU-level variant for that product and stores the seller-managed SKU identifier, the human-readable option combination such as a color and size summary, and an optional variant-specific price override relative to the product base price.
 *
 * Access to this operation is restricted to sellers, and ownership validation is mandatory. The requirements state that the shoppingMall shall allow a seller to add variants only for products owned by that seller and shall reject a requested variant operation when the product belongs to another seller. The service therefore must confirm that the target product's shopping_mall_seller_id matches the authenticated seller account before creating any variant. Because seller accounts carry approval_status, suspended, banned, and deleted state information, the operation must also enforce that only an approved, active seller with valid marketplace authority can create new variants.
 *
 * This operation is central to the product availability workflow. Product creation can be completed before any variants exist, but the requirements and business rules state that a product must have at least one variant to be purchasable. While a product with no variants may remain visible in search results and category listings, it must be shown as unavailable and prevented from being purchased. By creating the first active variant, the seller enables the product to move from visible-but-unavailable presentation toward actual purchasable behavior, subject to later stock availability rules and any variant-level price configuration.
 *
 * The request body should include only variant-specific fields required to establish the active mutable variant state. The API consumer must not attempt to provide product ownership context inside the body because the parent product is identified by the path parameter. The SKU code must remain unique within the scope of the target product because the variant table enforces a composite uniqueness rule on shopping_mall_product_id and sku_code. If a conflicting SKU already exists for the same product, if the product does not exist, if the product has been removed from active use, or if the authenticated seller is not the product owner, the operation must reject the request without creating any record.
 *
 * This operation is typically used after product creation and before customer purchase flows. A seller may first create the product through the product creation API, then call this endpoint one or more times to establish the purchasable option combinations for that product. Inventory is not created here because the shopping_mall_product_variants schema explicitly states that current stock is not stored on the variant row and must instead be derived from immutable inventory records. As a result, downstream inventory-management operations are responsible for stocking the new variant after it is created.
 *
 * @param props.connection
 * @param props.productId Target product identifier owned by the authenticated seller
 * @param props.body Creation data for the new product variant
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Authenticate the requester as a seller account and load the seller row from shopping_mall_sellers using the authenticated principal. Reject the request if the seller account does not exist, is soft deleted, is banned, is suspended, or does not have approval_status that permits selling.
 *
 * Load the parent product from shopping_mall_products by id = productId and deleted_at IS NULL. If no product exists, return a not-found error. Verify that shopping_mall_products.shopping_mall_seller_id equals the authenticated seller id. If ownership does not match, reject the request as a forbidden variant-management attempt according to the owner-only variant management rule.
 *
 * Validate the request body against the IShoppingMallProductVariant.ICreate contract. Persist a new shopping_mall_product_variants row with a generated UUID id, shopping_mall_product_id set from the path parameter, seller-provided sku_code, seller-provided option_summary, optional price override, created_at set to the current timestamp, updated_at set to the current timestamp, and deleted_at set to null. Do not accept or persist stock quantity on this table because stock is managed through immutable inventory records rather than the variant row itself.
 *
 * Before insert, check whether an active or existing variant with the same shopping_mall_product_id and sku_code already exists. The database composite unique constraint on [shopping_mall_product_id, sku_code] must be treated as authoritative. Convert uniqueness violations into a business-level conflict response describing that the SKU code is already in use for the target product.
 *
 * After creation, return the full created variant resource as IShoppingMallProductVariant. The implementation may also recalculate product-level purchasability projections used by read models or caches because business rules state that a product becomes purchasable only when at least one variant exists, although no direct mutation of shopping_mall_products is required solely to add the variant unless a derived read optimization is maintained elsewhere.
 *
 * Handle edge cases explicitly: reject creation for products owned by another seller, reject creation for inactive seller accounts, reject malformed UUID path values at the validation layer, reject duplicate SKU codes within the same product, and ensure the operation remains scoped strictly to the single parent product identified in the route.
 * @path /shoppingMall/seller/seller-products/:productId/variants
 * @accessor api.functional.shoppingMall.seller.seller_products.variants.create
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
     * Target product identifier owned by the authenticated seller
     */
    productId: string & tags.Format<"uuid">;

    /**
     * Creation data for the new product variant
     */
    body: IShoppingMallProductVariant.ICreate;
  };
  export type Body = IShoppingMallProductVariant.ICreate;
  export type Response = IShoppingMallProductVariant;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/seller/seller-products/:productId/variants",
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
    `/shoppingMall/seller/seller-products/${encodeURIComponent(props.productId ?? "null")}/variants`;
  export const random = (): IShoppingMallProductVariant =>
    typia.random<IShoppingMallProductVariant>();
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
      assert.param("productId")(() => typia.assert(props.productId));
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
 * Retrieve a filtered and paginated list of product variants belonging to a seller-owned product.
 *
 * This operation is used in the seller management experience to browse the current purchasable SKU-level variants for a single product identified by `productId`. In the underlying database, each `shopping_mall_product_variants` row stores the seller-managed variant identity and commercial option combination for a parent `shopping_mall_products` record, including the required `sku_code`, the human-readable `option_summary`, the optional variant-specific `price` override relative to the product `base_price`, and lifecycle timestamps such as `created_at`, `updated_at`, and `deleted_at`. The operation exists to support maintenance-oriented review of a product's variant set rather than customer storefront browsing.
 *
 * Access to this operation is restricted to authenticated sellers and must be enforced using product ownership. The parent `shopping_mall_products` record contains `shopping_mall_seller_id`, which identifies the seller account that owns the product listing, and the loaded requirements state that variant management is owner-only. Therefore, the server must verify that the authenticated seller is the owner of the target product before returning any variant data. If the product does not exist, is not accessible, or belongs to another seller, the request must be rejected instead of exposing cross-seller catalog information.
 *
 * This endpoint reflects the business boundary between products and variants. A product is the seller-owned catalog listing that customers discover, while a product variant is the specific purchasable combination such as a particular option summary and SKU. The loaded requirements also state that a product may remain visible while unavailable when it has no variants, and that product purchasability depends on the existence and stock availability of variants. For that reason, the response from this seller-side listing endpoint should help the seller understand whether the product currently has defined variants and which variants are active or removed from active use, but the endpoint itself does not determine cart eligibility for customers.
 *
 * The request body supports list browsing behavior such as pagination, sorting, and seller-facing filtering criteria. Typical filters may include partial matching on `sku_code` or `option_summary`, inclusion or exclusion of records with non-null `deleted_at`, and sort ordering by creation time, update time, or commercial fields such as variant price override. This is intentionally modeled as a PATCH collection operation so the client can send structured search criteria in JSON rather than being limited to simple query parameters.
 *
 * This operation is commonly used together with the seller product creation and maintenance flow. A seller may first create a product through the product creation endpoint, after which the product exists but can remain unavailable for purchase until at least one variant exists. The seller can then use variant creation or update operations to manage the actual purchasable combinations, and can use this listing endpoint to review the currently configured variant set for that owned product. The endpoint returns management-oriented summaries, while a separate detail endpoint should be used when a full single-variant record is needed.
 *
 * Expected failures include missing product records, unauthorized access to another seller's product, invalid search criteria, and attempts to retrieve variants for a product outside the caller's ownership boundary. The operation should also handle empty result sets normally: a product with no variants is still a valid product state, and the response should return an empty paginated collection rather than treating that condition as an error.
 *
 * @param props.connection
 * @param props.productId Target product identifier owned by the authenticated seller
 * @param props.body Search, pagination, and sorting criteria for product variants
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Validate that the caller is an authenticated seller.
 *
 * Load the parent `shopping_mall_products` row by `productId` and confirm it exists. Join or compare the product's `shopping_mall_seller_id` against the authenticated seller account ID from the session context. If the product is not found, return a not-found error. If the product belongs to a different seller, return a forbidden error.
 *
 * Build a paginated query over `shopping_mall_product_variants` scoped by `shopping_mall_product_id = :productId`. Support structured request criteria from `IShoppingMallProductVariant.IRequest`, including pagination, sort options, and optional text filters against `sku_code` and `option_summary`. Use the trigram-indexed text columns for efficient partial search where supported. Support explicit filtering on active versus deleted rows by interpreting `deleted_at` conditions from the request model if present.
 *
 * For each result item, return a summary projection suitable for seller maintenance screens. Include identifiers and key commercial fields needed for list rendering, such as the variant ID, SKU code, option summary, optional price override, timestamps, and deletion state according to the summary DTO definition. Do not expose variants from any other product or seller.
 *
 * Execute a count query or equivalent pagination strategy consistent with the shared page DTO contract, then return `IPageIShoppingMallProductVariant.ISummary`. Empty results are valid and should return an empty page.
 *
 * Do not mutate product or variant state in this operation. Suspension rules from the seller account apply to create and edit actions, but this read operation should remain retrieval-only. Error handling must distinguish malformed request criteria, missing parent product, and ownership violations.
 * @path /shoppingMall/seller/seller-products/:productId/variants
 * @accessor api.functional.shoppingMall.seller.seller_products.variants.index
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
     * Target product identifier owned by the authenticated seller
     */
    productId: string & tags.Format<"uuid">;

    /**
     * Search, pagination, and sorting criteria for product variants
     */
    body: IShoppingMallProductVariant.IRequest;
  };
  export type Body = IShoppingMallProductVariant.IRequest;
  export type Response = IPageIShoppingMallProductVariant.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/seller/seller-products/:productId/variants",
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
    `/shoppingMall/seller/seller-products/${encodeURIComponent(props.productId ?? "null")}/variants`;
  export const random = (): IPageIShoppingMallProductVariant.ISummary =>
    typia.random<IPageIShoppingMallProductVariant.ISummary>();
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
      assert.param("productId")(() => typia.assert(props.productId));
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
 * Retrieve a single seller-managed product variant for a specific product.
 *
 * This operation returns the current mutable variant record stored in `shopping_mall_product_variants` for the variant identified by `variantId` under the parent product identified by `productId`. The underlying variant entity is the canonical seller-managed SKU-level record for a purchasable choice within a product, storing the seller-managed `sku_code`, the human-readable `option_summary`, and an optional variant-level `price` override. When the variant-specific price is null, the parent product's `base_price` from `shopping_mall_products` remains the effective base commercial price for that choice.
 *
 * The endpoint is designed for seller-side maintenance and administrative oversight, not for customer storefront browsing. The requirements state that variant management is owner-only, meaning a seller may view and manage variants only for products owned by that seller, and attempts to manage variants for another seller's product must be rejected. Accordingly, the implementation must verify that the target product belongs to the authenticated seller before returning the variant in seller context. Administrative actors may access the record for platform oversight according to their governance role.
 *
 * This operation is tightly related to the product boundary defined in the domain model. A product in `shopping_mall_products` represents the overall merchandise offering owned by a seller, while a variant in `shopping_mall_product_variants` represents a specific purchasable option combination under that product. The variant record includes current mutable commercial identity fields and links back to the parent product through `shopping_mall_product_id`. Because product visibility and purchasable availability are separate business conditions, callers must not interpret the existence of this variant record alone as proof that the variant is currently purchasable in customer flows; inventory-derived availability and parent product state remain relevant to purchase behavior.
 *
 * The operation should also respect record lifecycle state. Both the parent product and variant schemas include `deleted_at`, and the product additionally carries a `status` field that governs listing and operational availability. Therefore, the service should ensure the requested variant belongs to the requested product, reject mismatched path combinations, and handle missing or logically removed records consistently. This endpoint is commonly used together with seller product detail and variant list operations so a seller can first locate an owned product, then inspect an individual variant for maintenance or audit purposes.
 *
 * @param props.connection
 * @param props.productId Target seller product identifier
 * @param props.variantId Target product variant identifier
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Load the parent product from `shopping_mall_products` by `productId` and the target variant from `shopping_mall_product_variants` by `variantId`. Verify that the variant's `shopping_mall_product_id` exactly matches the requested `productId`; if not, reject the request as an invalid nested-resource reference.
 *
 * For seller access, authorize only when the authenticated seller owns the parent product by matching the product row's `shopping_mall_seller_id` to the authenticated seller account identifier. If the seller does not own the product, reject access according to the owner-only variant management rule. Administrative actors may bypass seller-ownership checks for oversight use if the platform authorization layer permits it.
 *
 * Exclude records that should not be treated as active current resources when either the product or the variant is logically removed, based on `deleted_at`, unless the broader platform policy for administrative oversight explicitly allows such retrieval. Also consider the product `status` field when deciding whether seller-facing access to the current active record is valid.
 *
 * Return the variant as the response DTO mapped from the current row, including its identifier, parent product reference, SKU code, option summary, optional price override, and timestamps. Do not attempt to source stock quantity from the variant table because stock is not stored there; any stock or purchasability enrichment must be derived separately from immutable inventory records and only if the response schema supports such fields.
 *
 * Handle the main edge cases explicitly: product not found, variant not found, variant not belonging to the specified product, seller not owning the specified product, and inaccessible logically removed records. Keep the query path efficient by using primary-key lookup on the variant and validating the parent relation before DTO mapping.
 * @path /shoppingMall/seller/seller-products/:productId/variants/:variantId
 * @accessor api.functional.shoppingMall.seller.seller_products.variants.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * Target seller product identifier
     */
    productId: string & tags.Format<"uuid">;

    /**
     * Target product variant identifier
     */
    variantId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallProductVariant;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/seller/seller-products/:productId/variants/:variantId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/seller/seller-products/${encodeURIComponent(props.productId ?? "null")}/variants/${encodeURIComponent(props.variantId ?? "null")}`;
  export const random = (): IShoppingMallProductVariant =>
    typia.random<IShoppingMallProductVariant>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("productId")(() => typia.assert(props.productId));
      assert.param("variantId")(() => typia.assert(props.variantId));
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
 * Update a specific product variant belonging to one seller-owned product.
 *
 * This operation allows an approved seller to replace the mutable commercial details of an existing variant under a product in the seller's own catalog. The underlying variant record in `shopping_mall_product_variants` is the canonical seller-managed SKU-level definition for a purchasable choice under a parent `shopping_mall_products` record. It stores the seller-managed SKU identifier in `sku_code`, the human-readable option combination in `option_summary`, and the optional variant-specific price override in `price`. When the override is null, the parent product's `base_price` remains the effective selling price for that purchasable choice.
 *
 * Access to this operation is restricted by product ownership. The business rules require owner-only variant management, so the authenticated seller may update variants only when the parent product is owned by that seller through `shopping_mall_products.shopping_mall_seller_id`. If a seller attempts to update a variant for another seller's product, the request must be rejected. This endpoint is intentionally nested under `/seller-products/{productId}` because the variant is not treated as a standalone seller resource in business terms; it is part of the parent product's merchandise offering.
 *
 * This operation updates the active mutable variant state only. It does not directly change inventory quantities, because the schema explicitly defines stock as derived from immutable inventory ledger entries rather than stored on `shopping_mall_product_variants`. It also does not change the parent product's visibility rules. Products remain visible and may be shown as unavailable when they have no variants, while variant-level purchasability is determined separately from stock-based availability. A variant whose effective stock is zero remains out of stock for cart usage even if its descriptive fields are updated here.
 *
 * Clients typically use this endpoint as part of seller catalog maintenance after first retrieving product details or variant management views for the owned product. After the update succeeds, the returned representation should be used as the current source of truth for subsequent management screens. Validation failures should be raised for malformed identifiers, missing ownership, missing target resources, or invalid business data such as a duplicate SKU code within the same product scope.
 *
 * @param props.connection
 * @param props.productId Target product identifier owned by the authenticated seller
 * @param props.variantId Target variant identifier within the specified product
 * @param props.body Replacement data for the product variant
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Implement a seller-authorized variant replacement operation for `shopping_mall_product_variants`.
 *
 * 1. Authenticate the caller as a seller and verify the seller is in an approved standing permitted to manage catalog data.
 * 2. Load the parent product from `shopping_mall_products` by `productId` where `deleted_at` is null. If not found, return a not-found error.
 * 3. Verify the loaded product is owned by the authenticated seller by matching `shopping_mall_seller_id`. If ownership does not match, reject the operation as forbidden.
 * 4. Load the target variant from `shopping_mall_product_variants` by `variantId`, constrained to `shopping_mall_product_id = productId` and `deleted_at` is null. If not found, return a not-found error. This prevents cross-product variant updates.
 * 5. Validate the request body fields against DTO constraints. Allow updates only to mutable variant attributes represented by the variant entity: `sku_code`, `option_summary`, and `price`. Do not accept or derive stock quantity changes in this operation because stock is managed through immutable inventory records.
 * 6. If `sku_code` is changed, enforce the database uniqueness scope on `[shopping_mall_product_id, sku_code]` among active variants for the same product. Convert unique-constraint conflicts into a business-level validation error indicating the SKU code is already used within the product.
 * 7. Persist the update to `shopping_mall_product_variants`, setting `updated_at` to the current timestamp and replacing the mutable fields from the request body. Keep `shopping_mall_product_id`, `created_at`, and deletion state unchanged.
 * 8. Return the refreshed variant resource as `IShoppingMallProductVariant`. If the response DTO includes effective pricing or availability enrichments, derive them from the variant `price`, parent product `base_price`, and inventory state rather than storing redundant values.
 *
 * Error handling:
 * - Return not found when the product does not exist or the variant does not exist under that product.
 * - Return forbidden when the authenticated seller does not own the parent product.
 * - Return validation errors for malformed UUIDs, invalid field values, or duplicate SKU code conflicts.
 * - Do not mutate inventory, order, cart, or wishlist data in this operation.
 *
 * Implementation notes:
 * - Execute the ownership check before update.
 * - Scope all reads and writes to non-deleted active records.
 * - Use a transaction if additional read-after-write consistency steps are needed.
 * - Preserve the variant as the canonical active state while any historical tracking is handled by snapshot infrastructure outside this endpoint.
 * @path /shoppingMall/seller/seller-products/:productId/variants/:variantId
 * @accessor api.functional.shoppingMall.seller.seller_products.variants.update
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
     * Target product identifier owned by the authenticated seller
     */
    productId: string & tags.Format<"uuid">;

    /**
     * Target variant identifier within the specified product
     */
    variantId: string & tags.Format<"uuid">;

    /**
     * Replacement data for the product variant
     */
    body: IShoppingMallProductVariant.IUpdate;
  };
  export type Body = IShoppingMallProductVariant.IUpdate;
  export type Response = IShoppingMallProductVariant;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/seller/seller-products/:productId/variants/:variantId",
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
    `/shoppingMall/seller/seller-products/${encodeURIComponent(props.productId ?? "null")}/variants/${encodeURIComponent(props.variantId ?? "null")}`;
  export const random = (): IShoppingMallProductVariant =>
    typia.random<IShoppingMallProductVariant>();
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
      assert.param("productId")(() => typia.assert(props.productId));
      assert.param("variantId")(() => typia.assert(props.variantId));
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
 * Permanently remove a seller-managed product variant from an owned product after all commitment-protection checks pass.
 *
 * This operation allows a seller to delete one specific purchasable SKU-level variant belonging to a seller-owned product listing. In the underlying catalog model, the product is the seller-owned parent merchandise record, while the product variant is the specific purchasable option combination identified by its seller-managed SKU code and option summary. The endpoint therefore operates on the active mutable record in `shopping_mall_product_variants`, which belongs to `shopping_mall_products`, and is used by carts, order items, and inventory history. Because the variant is part of a seller's catalog maintenance workflow, the service must treat the product as the ownership boundary and the variant as the removable child within that boundary.
 *
 * Access to this operation is restricted to the seller who owns the parent product. The service must first resolve the product identified by `productId`, verify that it belongs to the authenticated seller through `shopping_mall_products.shopping_mall_seller_id`, and then verify that the target variant identified by `variantId` belongs to that same product through `shopping_mall_product_variants.shopping_mall_product_id`. If a seller attempts to manage a variant for a product owned by another seller, the request must be rejected. This reflects the requirement that variant management is owner-only and that sellers may edit or delete variants only for products they own.
 *
 * The deletion behavior is guarded by commitment-protection rules derived from current order and after-sales workflow state. A variant can be removed only when it has no related `shopping_mall_order_items` in `paid` status and no related order items in `shipped` status. In addition, the variant must not have any active cancellation request in `shopping_mall_cancellation_requests` with a pending state and must not have any active refund request in `shopping_mall_refund_requests` with a pending state. These checks protect active commerce commitments, shipment responsibilities, and in-flight dispute handling from losing their referenced purchasable choice while preserving historical records that already exist for order and audit purposes.
 *
 * When deletion succeeds, the variant is removed from the product's active set of customer-selectable options and must no longer appear as an available choice for new purchases. Historical order records, cancellation or refund history, and inventory ledger history remain preserved according to their own records and references. The inventory model is especially important here: `shopping_mall_inventory_records` is an immutable stock movement ledger, so this endpoint is not responsible for rewriting inventory history. Instead, it removes the active variant from future catalog use while leaving past ledger and transactional evidence intact.
 *
 * This operation is typically used together with seller product detail or variant listing endpoints that display the current set of active variants for a product. Clients should generally fetch the seller's product and variant management view before invoking this deletion so that the seller can confirm the exact target variant and understand whether the option is still present in the active catalog. If the deletion is rejected because paid or shipped order items exist, or because pending cancellation or refund handling exists, the client should direct the seller to resolve the outstanding operational commitments before retrying.
 *
 * Expected failures include product not found, variant not found under the specified product, ownership mismatch, and deletion blocked by paid items, shipped items, pending cancellation requests, or pending refund requests. The service should also reject requests targeting an already removed variant from active catalog use. These behaviors align the API with the seller-owned catalog model, the variant-specific purchase model, and the audit-preserving transactional design of the related order, after-sales, and inventory tables.
 *
 * @param props.connection
 * @param props.productId Target seller product's ID
 * @param props.variantId Target product variant's ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification 1. Authenticate the caller as a seller account.
 * 2. Load the product from `shopping_mall_products` by `productId` where `deleted_at IS NULL` if active-only filtering is used by the service. If no product exists, return a not-found error.
 * 3. Verify `shopping_mall_products.shopping_mall_seller_id` matches the authenticated seller. If not, reject with a forbidden error.
 * 4. Load the variant from `shopping_mall_product_variants` by `variantId` and `shopping_mall_product_id = productId`. If no matching variant exists, return a not-found error. If the variant is already removed from active use, reject consistently according to service conventions.
 * 5. Check blocking order commitments in `shopping_mall_order_items` for rows referencing `shopping_mall_product_variant_id = variantId` with `status IN ('paid', 'shipped')` and not logically removed according to service policy. If any row exists, reject deletion.
 * 6. Check pending cancellation requests by joining or querying `shopping_mall_cancellation_requests` for the target variant through its order items. Reject when any active request exists with pending status. Exclude logically removed request rows if the service treats `deleted_at` as inactive.
 * 7. Check pending refund requests by joining or querying `shopping_mall_refund_requests` for the target variant through its order items. Reject when any active request exists with pending status. Exclude logically removed request rows if the service treats `deleted_at` as inactive.
 * 8. Perform the deletion in a transaction. Prefer logical deletion by setting `shopping_mall_product_variants.deleted_at` and updating `updated_at`, or otherwise apply the platform's standard active-record removal strategy for variants. Do not rewrite or delete historical `shopping_mall_inventory_records`, `shopping_mall_order_items`, cancellation records, or refund records that preserve prior business activity.
 * 9. Return the deleted variant representation captured after mutation so the client can reconcile local state.
 * 10. Ensure the variant no longer appears in seller-maintained active catalog views or customer-selectable purchase options after deletion.
 *
 * Implementation notes:
 * - The parent product ownership check is mandatory before evaluating deletion eligibility.
 * - The variant must belong to the specified product; never delete by `variantId` alone in this seller-scoped endpoint.
 * - Inventory availability must not be recalculated by mutating ledger history here. `shopping_mall_inventory_records` is an immutable audit ledger and should remain preserved.
 * - Use indexed lookups on `shopping_mall_order_items.shopping_mall_product_variant_id`, `shopping_mall_cancellation_requests.shopping_mall_order_item_id`, and `shopping_mall_refund_requests.shopping_mall_order_item_id` to keep validation efficient.
 * - Return deterministic business errors for each blocking condition so clients can explain why the variant cannot yet be removed.
 * @path /shoppingMall/seller/seller-products/:productId/variants/:variantId
 * @accessor api.functional.shoppingMall.seller.seller_products.variants.erase
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
     * Target seller product's ID
     */
    productId: string & tags.Format<"uuid">;

    /**
     * Target product variant's ID
     */
    variantId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/shoppingMall/seller/seller-products/:productId/variants/:variantId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/seller/seller-products/${encodeURIComponent(props.productId ?? "null")}/variants/${encodeURIComponent(props.variantId ?? "null")}`;
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
      assert.param("productId")(() => typia.assert(props.productId));
      assert.param("variantId")(() => typia.assert(props.variantId));
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
