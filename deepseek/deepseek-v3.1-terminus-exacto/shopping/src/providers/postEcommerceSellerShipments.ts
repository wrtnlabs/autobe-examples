import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceShipmentCollector } from "../collectors/EcommerceShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceShipmentTransformer } from "../transformers/EcommerceShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

/**
 * Create a new shipment package containing order items from the seller's inventory.
 *
 * This API endpoint allows sellers to create shipments for fulfilling customer orders.
 * When a seller receives orders containing their products, they can use this endpoint
 * to create shipment records that bundle multiple order items into a single package
 * for efficient shipping. The shipment creation process requires providing carrier
 * information with tracking number and selecting which order items to include in the
 * shipment package.
 *
 * Upon successful creation, the system automatically updates the status of all
 * included order items to 'shipped' to reflect their progression in the order
 * fulfillment workflow.
 *
 * @param props.seller The authenticated seller payload
 * @param props.body Shipment creation details including carrier information
 * @returns Created shipment record with tracking information and associated order items
 */
export async function postEcommerceSellerShipments(props: {
  seller: SellerPayload;
  body: IEcommerceShipment.ICreate;
}): Promise<IEcommerceShipment> {
  // Verify seller exists and is active
  const seller = await MyGlobal.prisma.ecommerce_sellers.findFirst({
    where: {
      id: props.seller.id,
      account_status: "active",
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!seller) {
    throw new HttpException("Seller not found or account is not active", 403);
  }
  const sellerEntity: IEntity = {
    id: seller.id,
  };
  try {
    // Create shipment using Collector and Transformer
    const shipment = await MyGlobal.prisma.ecommerce_shipments.create({
      data: await EcommerceShipmentCollector.collect({
        body: props.body,
        seller: sellerEntity,
      }),
      ...EcommerceShipmentTransformer.select(),
    });
    return await EcommerceShipmentTransformer.transform(shipment);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // Unique constraint violation (tracking_number)
        throw new HttpException("Tracking number already exists", 409);
      }
    }
    throw error;
  }
}
