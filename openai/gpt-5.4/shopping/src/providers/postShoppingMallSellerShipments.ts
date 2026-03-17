import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddressSnapshot";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallTrackingInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTrackingInfo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallShipmentCollector } from "../collectors/ShoppingMallShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentTransformer } from "../transformers/ShoppingMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  try {
    return await MyGlobal.prisma.$transaction(async (prisma) => {
      const orderItems = await prisma.shopping_mall_order_items.findMany({
        where: {
          id: {
            in: props.body.orderItemIds,
          },
        },
        select: {
          id: true,
          shopping_mall_order_id: true,
          shopping_mall_seller_id: true,
          shopping_mall_shipment_id: true,
          status: true,
          deleted_at: true,
        },
      });
      if (orderItems.length !== props.body.orderItemIds.length)
        throw new HttpException("One or more order items were not found.", 404);
      if (orderItems.some((item) => item.deleted_at !== null))
        throw new HttpException("Deleted order items cannot be shipped.", 400);
      if (
        orderItems.some(
          (item) => item.shopping_mall_seller_id !== props.seller.id,
        )
      )
        throw new HttpException("Forbidden", 403);
      const firstOrderItem = orderItems[0];
      if (firstOrderItem === undefined)
        throw new HttpException("At least one order item is required.", 400);
      if (
        orderItems.some(
          (item) =>
            item.shopping_mall_order_id !==
            firstOrderItem.shopping_mall_order_id,
        )
      )
        throw new HttpException(
          "All order items in a shipment must belong to the same order.",
          409,
        );
      if (orderItems.some((item) => item.shopping_mall_shipment_id !== null))
        throw new HttpException(
          "One or more order items are already assigned to a shipment.",
          409,
        );
      if (orderItems.some((item) => item.status !== "paid"))
        throw new HttpException(
          "Only paid order items are eligible for shipment creation.",
          409,
        );
      const created = await prisma.shopping_mall_shipments.create({
        data: await ShoppingMallShipmentCollector.collect({
          body: props.body,
          seller: {
            id: props.seller.id,
          },
        }),
        ...ShoppingMallShipmentTransformer.select(),
      });
      await prisma.shopping_mall_order_items.updateMany({
        where: {
          id: {
            in: props.body.orderItemIds,
          },
        },
        data: {
          shopping_mall_shipment_id: created.id,
          status: "shipped",
          delivered_at: null,
          updated_at: created.updated_at,
        },
      });
      const siblingItems = await prisma.shopping_mall_order_items.findMany({
        where: {
          shopping_mall_order_id: firstOrderItem.shopping_mall_order_id,
          deleted_at: null,
        },
        select: {
          status: true,
        },
      });
      await prisma.shopping_mall_orders.update({
        where: {
          id: firstOrderItem.shopping_mall_order_id,
        },
        data: {
          status: siblingItems.every((item) => item.status === "shipped")
            ? "shipped"
            : "partial_shipped",
          updated_at: created.updated_at,
        },
      });
      const shipment = await prisma.shopping_mall_shipments.findUniqueOrThrow({
        where: {
          id: created.id,
        },
        ...ShoppingMallShipmentTransformer.select(),
      });
      return await ShoppingMallShipmentTransformer.transform(shipment);
    });
  } catch (error) {
    if (error instanceof HttpException) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new HttpException(
        "Tracking information already exists for the given carrier and tracking number.",
        409,
      );
    throw error;
  }
}
