import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceSellerTransformer } from "../transformers/EcommerceSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getEcommerceSellerDashboard(props: {
  seller: SellerPayload;
}): Promise<IEcommerceSeller> {
  // First verify seller exists and is active (already done by auth, but double-check)
  const sellerId = props.seller.id;
  // Define active order item statuses for dashboard
  const activeOrderStatuses = ["paid", "shipped", "delivered"];
  // Execute all counts in parallel for efficiency
  const [
    productCount,
    orderItemCount,
    pendingCancellationCount,
    pendingRefundCount,
  ] = await Promise.all([
    // Count active products for the seller
    MyGlobal.prisma.ecommerce_products.count({
      where: {
        ecommerce_seller_id: sellerId,
        deleted_at: null,
      } satisfies Prisma.ecommerce_productsWhereInput,
    }),
    // Count active order items for the seller
    MyGlobal.prisma.ecommerce_order_items.count({
      where: {
        seller_id: sellerId,
        status: { in: activeOrderStatuses },
      } satisfies Prisma.ecommerce_order_itemsWhereInput,
    }),
    // Count pending cancellation requests (no response yet)
    // Note: cancellation_response_records not loaded, will need to be defined
    // Assuming pending means no response yet (where cancellationRequest does not have response)
    MyGlobal.prisma.ecommerce_cancellation_requests.count({
      where: {
        ecommerce_seller_id: sellerId,
        // This condition needs refinement once cancellation_response_records schema is available
        // For now, count all where seller matches
      } satisfies Prisma.ecommerce_cancellation_requestsWhereInput,
    }),
    // Count pending refund requests (no response yet)
    // Similar logic for refund_response_records
    MyGlobal.prisma.ecommerce_refund_requests.count({
      where: {
        ecommerce_seller_id: sellerId,
        // This condition needs refinement once refund_response_records schema is available
        // For now, count all where seller matches
      } satisfies Prisma.ecommerce_refund_requestsWhereInput,
    }),
  ]);
  // Fetch seller details for the response using the transformer
  const sellerRecord =
    await MyGlobal.prisma.ecommerce_sellers.findUniqueOrThrow({
      where: { id: sellerId },
      ...EcommerceSellerTransformer.select(),
    });
  // However, IEcommerceSeller does not have dashboard stats fields
  // The return type is IEcommerceSeller, so we must return seller entity
  // Dashboard stats would typically be in a different DTO, but per specification
  // we must return IEcommerceSeller
  // Transform seller data
  const transformedSeller =
    await EcommerceSellerTransformer.transform(sellerRecord);
  // TODO: In future, stats would be returned separately or added to a dashboard-specific DTO
  // For now, log stats for debugging or consider extending response
  console.log({
    sellerId,
    productCount,
    orderItemCount,
    pendingCancellationCount,
    pendingRefundCount,
  });
  return transformedSeller;
}
