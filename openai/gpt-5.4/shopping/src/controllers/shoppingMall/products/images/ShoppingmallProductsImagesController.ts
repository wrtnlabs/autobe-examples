import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallProduct } from "../../../../api/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "../../../../api/structures/IShoppingMallProductImage";
import { getShoppingMallProductsProductIdImagesImageId } from "../../../../providers/getShoppingMallProductsProductIdImagesImageId";
import { patchShoppingMallProductsProductIdImages } from "../../../../providers/patchShoppingMallProductsProductIdImages";

@Controller("/shoppingMall/products/:productId/images")
export class ShoppingmallProductsImagesController {
  /**
   * Update the ordered image gallery for a seller-owned product listing.
   *
   * This operation modifies the current gallery presentation attached to a single product identified by productId. The underlying live records are stored in shopping_mall_product_images, which represent ordered gallery images belonging to a product listing and keep the stored resource URI, the product-scoped display order, and whether an image is the current thumbnail image. In the product domain, images are part of the seller-controlled editable business content of shopping_mall_products, and the first image in the ordered gallery is meaningful because it becomes the main thumbnail shown as the primary visual representation in listing views.
   *
   * Access to this operation must be restricted to the authenticated seller who owns the target shopping_mall_products record. The service must deny attempts to manage images for a product owned by another seller. This follows the business requirement that product image management applies only to the seller who owns the product, and that add, reorder, and delete actions are allowed only for seller-owned product image management. Customers do not perform this edit, and while administrators may review product snapshots and historical image arrangements, the loaded requirements do not make them live editors of seller product galleries.
   *
   * The operation updates the current live image set in shopping_mall_product_images so that customer-facing views reflect the new product presentation. Because the schema defines sequence as the product-scoped display order and is_thumbnail as whether an image is the current thumbnail shown as the primary product image, the service must normalize the submitted gallery so ordering is unambiguous and thumbnail designation is consistent with the final first image. If an image that previously served as the thumbnail is removed or moved, the resulting first remaining image becomes the effective main thumbnail for product listings, matching the requirement that ordered presentation determines thumbnail meaning.
   *
   * This endpoint has an important historical preservation responsibility. The business requirements state that image additions, deletions, and reordering are part of the product’s editable state and must be captured whenever a product snapshot is created after the related edit. Therefore, after applying the live gallery change, the service must create a shopping_mall_product_snapshots record as the immutable snapshot event anchor and persist one shopping_mall_product_snapshot_image_copies row per resulting gallery image. Those immutable copy rows preserve the image_uri, sequence, and thumbnail status as they existed at that edit point, ensuring that later review can distinguish current gallery state from historical product presentation.
   *
   * This operation is typically used after the seller has already loaded the current product and gallery state through read operations. Clients should submit the desired resulting gallery arrangement as a complete update of the current image set so the server can safely reconcile additions, removals, and reordered images in one transaction. On validation failure, the service should reject malformed gallery definitions, missing ownership context, non-existent products, duplicate or inconsistent ordering, or impossible thumbnail assignments. On success, the response returns the refreshed product representation so clients can immediately reflect the updated gallery and thumbnail state.
   *
   * @param connection
   * @param productId Target product's UUID
   * @param body Desired product image gallery update data
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification 1. Authenticate the caller as a seller session and load the target shopping_mall_products row by id = productId and deleted_at IS NULL if product visibility rules require excluding removed products from live edits.
   * 2. Verify that the product exists and that shopping_mall_products.shopping_mall_seller_id matches the authenticated seller account id. If not, reject the request as forbidden.
   * 3. Validate the request body as the desired resulting gallery state. Ensure every submitted image entry includes a resolvable image URI, ensure the intended ordering is deterministic, and ensure the final state can produce exactly one effective thumbnail image. Because shopping_mall_product_images has a unique constraint on [shopping_mall_product_id, sequence], normalize the final gallery into unique ascending sequence values before persistence.
   * 4. Start a transaction.
   * 5. Load current active shopping_mall_product_images rows for the product ordered by sequence.
   * 6. Reconcile the live gallery against the requested state. For images that remain, update sequence and is_thumbnail as needed. For newly introduced images, insert new shopping_mall_product_images rows with created_at and updated_at set to now and deleted_at = null. For removed images, mark deleted_at to now and update updated_at, rather than hard deleting, because the schema explicitly supports currently active or soft-deleted gallery images.
   * 7. Guarantee that the first image in the final ordered active gallery is flagged as the thumbnail. If the request designates thumbnail inconsistently, override to the normalized first image so live data matches the business rule that the first image is the main thumbnail used in product listings.
   * 8. Update shopping_mall_products.updated_at to now because image changes are treated as edits to the product’s current sellable catalog record.
   * 9. Insert a shopping_mall_product_snapshots row for the product as the immutable snapshot event record.
   * 10. Query the resulting active shopping_mall_product_images rows in final sequence order and insert corresponding shopping_mall_product_snapshot_image_copies rows for the new snapshot, copying image_uri, sequence, thumbnail state, and created_at. This preserves historical product presentation even if live images later change again.
   * 11. Commit the transaction.
   * 12. Return the refreshed product aggregate, including its current image collection, so downstream consumers can render the updated gallery and thumbnail.
   *
   * Edge cases:
   * - If the product does not exist, return not found.
   * - If the product belongs to another seller, return forbidden.
   * - If the request would produce an empty gallery and business rules disallow that, reject validation; otherwise allow and create a snapshot representing the empty resulting gallery.
   * - If duplicate sequence values are supplied, normalize or reject before writing, but never violate the database unique constraint.
   * - If multiple thumbnails are requested or none is clearly designated, normalize the first final image as the single thumbnail.
   * - If any referenced image URI fails file validation or storage policy checks, reject the update before changing database state.
   * - Snapshot creation must occur in the same transaction as the live gallery update so historical state always matches the committed edit point.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async update(
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallProductImage.IUpdate,
  ): Promise<IShoppingMallProduct> {
    try {
      return await patchShoppingMallProductsProductIdImages({
        productId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single product gallery image belonging to a specific product.
   *
   * This operation returns one image record from the ordered gallery attached to a product listing. In the underlying data model, the product image is an "Ordered gallery image belonging to a product listing" and stores the resource URI, the product-scoped display order, and whether it is the current thumbnail image. The response is therefore used to inspect a specific merchandise image in the context of its parent product rather than as an independent media resource. This reflects the domain requirement that product gallery images represent the merchandise itself and are separate from seller branding images such as a shop logo.
   *
   * The parent-child relationship in the database is mandatory: each shopping_mall_product_images row belongs to one shopping_mall_products row through shopping_mall_product_id. The image record includes image_uri for the stored media location, sequence for ordered presentation, and is_thumbnail to indicate whether the image is the current primary product image. Because the business requirements state that the first image in the ordered gallery serves as the listing thumbnail while the full ordered gallery is shown on the product detail page, this operation is suitable when an application needs the exact metadata of one image selected from a product gallery.
   *
   * Authorization and visibility must be evaluated through the parent product context. Sellers can manage and view the current image gallery only for products they own, while customer-facing access is meaningful only when the parent product is visible in storefront contexts and the image has not been removed from the active gallery. The implementation must therefore verify both the specified product-image relationship and any applicable ownership or visibility rule before returning the resource.
   *
   * This operation is commonly used together with the parent product detail retrieval or product image listing flow. A client would typically obtain the product context first, then use the image identifier to inspect or manage one specific gallery item. If product images have been reordered or removed, callers should expect the returned sequence and thumbnail designation to reflect the product's current active gallery state rather than historical snapshot state, because historical image arrangements are preserved through separate product snapshot records and are outside the scope of this endpoint.
   *
   * If the product does not exist, the image does not exist, the image does not belong to the specified product, or the image has already been removed from the current active gallery, the operation must fail rather than returning unrelated or obsolete media. This preserves the integrity of the product-scoped gallery model and prevents clients from treating gallery images as globally free-floating assets.
   *
   * @param connection
   * @param productId Target product's ID
   * @param imageId Target product image's ID
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement this operation by loading the target shopping_mall_product_images row by id and validating that its shopping_mall_product_id matches the productId path parameter. Join or separately load the parent shopping_mall_products row because authorization and storefront visibility must be evaluated through the parent product.
   *
   * For seller-side access, confirm that the authenticated seller owns the parent product via shopping_mall_products.shopping_mall_seller_id before returning the image. For customer-facing access, allow retrieval only when the parent product is currently available for storefront viewing according to its status and deletion state. In all cases, reject retrieval when shopping_mall_product_images.deleted_at is not null, because removed gallery images should not be exposed as part of the current gallery.
   *
   * Return the current image metadata from shopping_mall_product_images, including the stored image URI, product-scoped sequence, and thumbnail flag. Do not rewrite sequence or thumbnail values in this read operation. Do not derive historical snapshot content here; snapshot inspection belongs to separate snapshot endpoints backed by product snapshot tables.
   *
   * Error handling must distinguish among: missing parent product, missing image, image that belongs to a different product, deleted current-gallery image, and forbidden access due to ownership or visibility restrictions. The implementation should avoid leaking whether an image exists under another product by treating product-image mismatch as a not-found outcome from the caller's perspective.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":imageId")
  public async at(
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("imageId")
    imageId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallProductImage> {
    try {
      return await getShoppingMallProductsProductIdImagesImageId({
        productId,
        imageId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
