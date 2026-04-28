import { IEcommercePlatformSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerDashboard";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommercePlatformSellerDashboard(props: {
  seller: SellerPayload;
}): Promise<IEcommercePlatformSellerDashboard> {
  const sellerRecord =
    await MyGlobal.prisma.ecommerce_platform_sellers.findUniqueOrThrow({
      where: {
        id: props.seller.id,
      },
      select: {
        approval_status: true,
        rejection_reason: true,
        sellerProfile: {
          select: {
            id: true,
            shop_name: true,
            shop_description: true,
            logo_image_uri: true,
          },
        },
      },
    });
  if (sellerRecord.sellerProfile === null) {
    throw new HttpException("Seller profile not found", 404);
  }
  const totalProducts = await MyGlobal.prisma.ecommerce_platform_products.count(
    {
      where: {
        ecommerce_platform_seller_profile_id: sellerRecord.sellerProfile.id,
        deleted_at: null,
      },
    },
  );
  const totalOrderItems =
    await MyGlobal.prisma.ecommerce_platform_order_items.count({
      where: {
        productVariant: {
          product: {
            ecommerce_platform_seller_profile_id: sellerRecord.sellerProfile.id,
          },
        },
      },
    });
  const totalPendingCancellationRequests =
    await MyGlobal.prisma.ecommerce_platform_cancellation_requests.count({
      where: {
        status: "pending",
        orderItem: {
          productVariant: {
            product: {
              ecommerce_platform_seller_profile_id:
                sellerRecord.sellerProfile.id,
            },
          },
        },
      },
    });
  const totalPendingRefundRequests =
    await MyGlobal.prisma.ecommerce_platform_refund_requests.count({
      where: {
        status: "pending",
        seller_profile_id: sellerRecord.sellerProfile.id,
      },
    });
  return {
    approvalStatus: sellerRecord.approval_status,
    rejectionReason: sellerRecord.rejection_reason,
    shopName: sellerRecord.sellerProfile.shop_name,
    shopDescription: sellerRecord.sellerProfile.shop_description,
    logoImageUri: sellerRecord.sellerProfile.logo_image_uri,
    totalProducts,
    totalOrderItems,
    totalPendingCancellationRequests,
    totalPendingRefundRequests,
  } satisfies IEcommercePlatformSellerDashboard;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommercePlatformSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerDashboard";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommercePlatformSellerDashboard(props: {
//   seller: SellerPayload;
// }): Promise<IEcommercePlatformSellerDashboard> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------