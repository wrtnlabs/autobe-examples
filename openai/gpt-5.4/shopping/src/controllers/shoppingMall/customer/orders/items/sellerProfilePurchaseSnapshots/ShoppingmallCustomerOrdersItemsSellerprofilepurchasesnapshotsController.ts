import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallSellerProfilePurchaseSnapshot } from "../../../../../../api/structures/IPageIShoppingMallSellerProfilePurchaseSnapshot";
import { IShoppingMallSellerProfilePurchaseSnapshot } from "../../../../../../api/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import { CustomerAuth } from "../../../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../../../decorators/payload/CustomerPayload";
import { getShoppingMallCustomerOrdersOrderIdItemsItemIdSellerProfilePurchaseSnapshotsSellerProfilePurchaseSnapshotId } from "../../../../../../providers/getShoppingMallCustomerOrdersOrderIdItemsItemIdSellerProfilePurchaseSnapshotsSellerProfilePurchaseSnapshotId";
import { patchShoppingMallCustomerOrdersOrderIdItemsItemIdSellerProfilePurchaseSnapshots } from "../../../../../../providers/patchShoppingMallCustomerOrdersOrderIdItemsItemIdSellerProfilePurchaseSnapshots";
import { postShoppingMallCustomerOrdersOrderIdItemsItemIdSellerProfilePurchaseSnapshots } from "../../../../../../providers/postShoppingMallCustomerOrdersOrderIdItemsItemIdSellerProfilePurchaseSnapshots";

@Controller(
  "/shoppingMall/customer/orders/:orderId/items/:itemId/sellerProfilePurchaseSnapshots",
)
export class ShoppingmallCustomerOrdersItemsSellerprofilepurchasesnapshotsController {
  /**
   * Create the purchase-time seller profile snapshot for a specific order item within an existing order.
   *
   * This operation creates the immutable historical seller shop identity record stored in `shopping_mall_seller_profile_purchase_snapshots` for the target `shopping_mall_order_items` row. The snapshot preserves the seller-facing shop information that was shown when the customer purchased the item, specifically the captured `shop_name` and optional `logo_uri`. As described by the database schema, this child record exists to keep order-history display accurate even when the seller later edits the current profile, becomes suspended, or deletes the seller account.
   *
   * The operation is intended for trusted order-processing workflows and administrative recovery paths, not for ordinary customer-managed or seller-managed profile editing. Historical order requirements state that past orders must continue to show preserved seller identity, and that customers and administrators must still be able to review the preserved purchase-time seller identity when the current seller profile is unavailable. Because of that preservation purpose, the created snapshot becomes part of the permanent commercial record associated with the order item.
   *
   * The target order item must belong to the order identified in the path. The implementation must validate that `itemId` resolves to an existing `shopping_mall_order_items` record whose `shopping_mall_order_id` matches `orderId` before creating the snapshot. Since the snapshot table is defined as a 1:1 dependent child of an order item through a unique `shopping_mall_order_item_id`, this operation must reject duplicate creation attempts for an order item that already has a preserved seller profile purchase snapshot.
   *
   * This operation is closely related to order creation and order-history retrieval flows. In a standard purchase flow, the snapshot should normally be created during order placement together with the order item so that historical review remains reliable from the beginning. Later historical order APIs will depend on this preserved snapshot to display the original seller shop identity if the current seller profile cannot be retrieved or no longer exists.
   *
   * On success, the response returns the created seller profile purchase snapshot resource. On failure, the operation should report that the order does not exist, the order item does not exist, the order item does not belong to the specified order, or a snapshot already exists for that order item.
   *
   * @param connection
   * @param orderId Target order identifier.
   * @param itemId Target order item identifier within the specified order.
   * @param body Purchase-time seller identity to preserve for the order item
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Implement a create-seller-profile-purchase-snapshot use case for a specific order item.
   *
   * 1. Authorize the caller as an internal trusted workflow or an administrator-level actor. Do not expose this as a normal customer or seller self-service write operation.
   * 2. Load the target `shopping_mall_orders` row by `orderId`. If not found, return a not-found error.
   * 3. Load the target `shopping_mall_order_items` row by `itemId`. If not found, return a not-found error.
   * 4. Verify that `shopping_mall_order_items.shopping_mall_order_id` equals `orderId`. If the order item does not belong to the specified order, reject the request with a validation or not-found style error to prevent cross-order access.
   * 5. Check whether a `shopping_mall_seller_profile_purchase_snapshots` row already exists for `shopping_mall_order_item_id = itemId`. Because the schema has a unique constraint on `shopping_mall_order_item_id`, reject duplicate creation attempts with a conflict error.
   * 6. Validate request payload fields against schema reality: `shop_name` is required and must be stored as the preserved sale-time shop name; `logo_uri` is optional and should be persisted as provided when present.
   * 7. Insert a new `shopping_mall_seller_profile_purchase_snapshots` row with a generated UUID `id`, `shopping_mall_order_item_id = itemId`, request `shop_name`, request `logo_uri`, and set `created_at` and `updated_at` to the current timestamp. `deleted_at` must remain null on creation.
   * 8. Return the created snapshot resource.
   *
   * Implementation notes:
   * - Execute the existence check and insert in a transaction or rely on the unique constraint plus conflict handling to avoid race-condition duplicates.
   * - This operation creates historical evidence used by later order-history retrieval, so never overwrite an existing snapshot through this endpoint.
   * - Do not derive the snapshot from a current seller profile after creation; the purpose is to preserve purchase-time identity exactly as captured at creation time.
   * - Error handling must distinguish among missing order, missing order item, mismatched order-item ownership, and duplicate snapshot creation for clean client behavior and auditability.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedParam("itemId")
    itemId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallSellerProfilePurchaseSnapshot.ICreate,
  ): Promise<IShoppingMallSellerProfilePurchaseSnapshot> {
    try {
      return await postShoppingMallCustomerOrdersOrderIdItemsItemIdSellerProfilePurchaseSnapshots(
        {
          customer,
          orderId,
          itemId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the preserved purchase-time seller profile snapshot records for a specific order item within a customer order.
   *
   * This operation exposes the historical shop identity that was captured when the order item was purchased, rather than relying on the seller's current live profile. The underlying `shopping_mall_seller_profile_purchase_snapshots` table is defined as a purchase-time snapshot of the seller's public shop identity for a single order item, preserving denormalized seller identity fields needed for order-history display. In practice, this allows clients to show the historical `shop_name` and `logo_uri` that were valid at checkout, even if the seller later edits the profile, becomes suspended, or deletes the seller account.
   *
   * The operation is intended for historical order review flows. The requirements state that past orders must continue to show preserved shop identity and that historical order access must not fail merely because the current seller account or current shop profile is unavailable. This is especially important in dispute review and customer order-history screens, where the platform must continue to present the purchase-time seller identity from the preserved snapshot. The order detail experience also includes shipment and item-level review, so this endpoint complements order and order-item detail retrieval by supplying the immutable seller context attached to the selected purchased line.
   *
   * Security and authorization must be enforced by ownership and operational scope. A customer may access this data only for the customer's own order history. A seller may access this data only when the referenced order item belongs to that seller's operational responsibility. Administrators may access the data for platform oversight and dispute resolution. The implementation must never require the current seller profile in order to serve this response, because the business rules explicitly require continued historical access when live seller information is missing.
   *
   * The response is modeled as a paginated collection because the endpoint is provided as a PATCH nested-resource search operation. Even though the schema currently defines a one-to-one relationship between `shopping_mall_order_items` and `shopping_mall_seller_profile_purchase_snapshots`, the API contract remains collection-oriented for consistency with PATCH-based index operations and to support standard request-body filtering, sorting, and pagination behavior. Consumers should typically obtain the parent order and item context first, then call this endpoint to retrieve the historical seller identity records associated with that order item.
   *
   * @param connection
   * @param orderId Target order code (global scope)
   * @param itemId Target order item's ID within the specified order
   * @param body Search criteria and pagination options for historical seller profile purchase snapshots
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Validate the parent order and order item scope before querying snapshot data.
   *
   * 1. Resolve the parent order by `shopping_mall_orders.code` using the `orderId` path parameter as a code-based identifier, not as a UUID. Reject when no order exists for the supplied code.
   * 2. Resolve the parent order item by `shopping_mall_order_items.id` using the `itemId` path parameter, and verify that the item belongs to the resolved order through `shopping_mall_order_items.shopping_mall_order_id = shopping_mall_orders.id`. Reject when the item does not exist or is not part of the specified order.
   * 3. Apply authorization by actor scope:
   *    - customer: allow only when `shopping_mall_orders.shopping_mall_customer_id` equals the authenticated customer id;
   *    - seller: allow only when `shopping_mall_order_items.shopping_mall_seller_id` equals the authenticated seller id;
   *    - administrator and superAdministrator: allow for oversight access.
   * 4. Query `shopping_mall_seller_profile_purchase_snapshots` filtered by `shopping_mall_order_item_id = shopping_mall_order_items.id`. Treat the relation as immutable historical data. Do not depend on any current seller profile table lookup to build the main response.
   * 5. Support request-body driven list behavior using the standard request DTO pattern: pagination, deterministic sorting, and optional inclusion of deleted records only if such behavior is supported globally by the platform's request DTO conventions. Default sorting should prefer `created_at` descending, then `id` ascending for stable paging.
   * 6. Return a paginated response of `IShoppingMallSellerProfilePurchaseSnapshot` records. Even if zero or one record is expected in ordinary data, preserve the paginated shape required by PATCH index operations.
   * 7. Preserve historical access behavior in failure handling. If the current seller account or live seller profile is unavailable, still return the preserved snapshot record when it exists. Missing live seller data must not block retrieval of historical purchase-time seller identity.
   * 8. Exclude any mutation logic. This operation must not create, update, or remove snapshot rows because the snapshot is an immutable purchase-time record intended for historical order display.
   *
   * Error handling:
   * - 404-equivalent failure when the order code does not exist.
   * - 404-equivalent failure when the order item id does not exist under the specified order.
   * - 403-equivalent failure when the authenticated actor is outside the allowed ownership or oversight scope.
   * - Successful empty page when the parent scope is valid but no snapshot record is available, while still not requiring current seller profile availability.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedParam("itemId")
    itemId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallSellerProfilePurchaseSnapshot.IRequest,
  ): Promise<IPageIShoppingMallSellerProfilePurchaseSnapshot> {
    try {
      return await patchShoppingMallCustomerOrdersOrderIdItemsItemIdSellerProfilePurchaseSnapshots(
        {
          customer,
          orderId,
          itemId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the preserved purchase-time seller shop identity for a specific order item within a specific order.
   *
   * This operation returns the immutable historical seller identity captured in `shopping_mall_seller_profile_purchase_snapshots`, which is the purchase-time snapshot of the seller's public shop identity for a single order item. The snapshot preserves the `shop_name` and optional `logo_uri` that were shown when the customer purchased the item, rather than depending on the seller's current live profile. This directly supports historical order review where the system must continue showing a consistent seller history for each purchased item.
   *
   * The endpoint is intentionally nested under the order and order item because the business meaning of this snapshot is inseparable from the purchased line item recorded in `shopping_mall_order_items` and the parent transaction recorded in `shopping_mall_orders`. The implementation must confirm that the specified order item belongs to the specified order and that the specified snapshot belongs to that order item before returning data. This protects against cross-order or cross-item access to unrelated historical records.
   *
   * This operation is especially important for the historical preservation rules described for past orders. The requirements state that when a seller account is deleted after orders already exist, past orders must continue to show the preserved shop identity captured at purchase time. They also state that if the current seller profile cannot be retrieved, historical order viewing must still succeed by using the preserved purchase-time snapshot. Therefore, clients should treat this API as the canonical source of seller identity for historical order-item display, dispute review, and other order-history experiences where current seller profile data may be outdated or unavailable.
   *
   * Access to this operation must follow order ownership and oversight boundaries. A customer may read the snapshot only for their own order. A seller may read it only when the specified order item belongs to that seller's fulfillment responsibility. Administrators and super administrators may read it for operational oversight and dispute resolution. The operation must not require the current seller profile to exist, and missing live seller data must not block successful retrieval of a valid preserved snapshot.
   *
   * This operation is typically used together with the parent order-detail retrieval flow. Clients generally retrieve order details first to identify available order items and their associated historical display context, then request the specific seller profile purchase snapshot when detailed seller identity presentation is needed for an item-level view. If the parent order or order item cannot be found, or if the nested relationship is inconsistent, the operation must fail rather than returning unrelated historical data.
   *
   * @param connection
   * @param orderId Target order's UUID identifier
   * @param itemId Target order item's UUID identifier within the order
   * @param sellerProfilePurchaseSnapshotId Target seller profile purchase snapshot's UUID identifier for the order item
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Implement a read-only detail query for `shopping_mall_seller_profile_purchase_snapshots` scoped by parent order and order item.
   *
   * 1. Authenticate the caller and authorize by actor type.
   *    - Customer: allow only if `shopping_mall_orders.id = {orderId}` belongs to the authenticated customer.
   *    - Seller: allow only if `shopping_mall_order_items.id = {itemId}` belongs to the authenticated seller through `shopping_mall_seller_id`.
   *    - Administrator and superAdministrator: allow for oversight without ownership restriction.
   *
   * 2. Validate the nested resource chain in a single scoped query when possible.
   *    - Join `shopping_mall_seller_profile_purchase_snapshots` to `shopping_mall_order_items` on `shopping_mall_order_item_id`.
   *    - Join `shopping_mall_order_items` to `shopping_mall_orders` on `shopping_mall_order_id`.
   *    - Filter by `shopping_mall_orders.id = {orderId}`.
   *    - Filter by `shopping_mall_order_items.id = {itemId}`.
   *    - Filter by `shopping_mall_seller_profile_purchase_snapshots.id = {sellerProfilePurchaseSnapshotId}`.
   *    - Return exactly one record or fail as not found.
   *
   * 3. Do not depend on any live seller profile lookup for successful response construction.
   *    - The snapshot itself is the source of truth for historical seller identity.
   *    - Even if the current seller account or seller profile is unavailable, a valid snapshot must still be returned.
   *
   * 4. Return the full snapshot DTO mapped from the persisted record.
   *    - Include the preserved `shop_name` and optional `logo_uri` captured at purchase time.
   *    - Include temporal fields defined on the snapshot entity as supported by the DTO schema.
   *
   * 5. Error handling.
   *    - Reject with not found if the order does not exist, the item does not belong to that order, or the snapshot does not belong to that item.
   *    - Reject with forbidden if the caller lacks permission for the target order or order item.
   *    - Do not silently fall back to unrelated live seller profile data.
   *
   * 6. Data integrity and lifecycle considerations.
   *    - Treat the snapshot as immutable historical data.
   *    - Do not mutate snapshot fields during retrieval.
   *    - Do not exclude the record merely because the seller account was deleted or suspended after purchase.
   *
   * Prefer one repository query with joins and ownership predicates to avoid time-of-check/time-of-use inconsistencies between separate lookups.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":sellerProfilePurchaseSnapshotId")
  public async at(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("orderId")
    orderId: string & tags.Format<"uuid">,
    @TypedParam("itemId")
    itemId: string & tags.Format<"uuid">,
    @TypedParam("sellerProfilePurchaseSnapshotId")
    sellerProfilePurchaseSnapshotId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallSellerProfilePurchaseSnapshot> {
    try {
      return await getShoppingMallCustomerOrdersOrderIdItemsItemIdSellerProfilePurchaseSnapshotsSellerProfilePurchaseSnapshotId(
        {
          customer,
          orderId,
          itemId,
          sellerProfilePurchaseSnapshotId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
