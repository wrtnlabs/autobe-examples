import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipment";
import { IShoppingOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrder";
import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import { IShoppingShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentPackage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingSellerShipmentsCode(props: {
  seller: SellerPayload;
  code: string;
  body: IShoppingShipment.IUpdate;
}): Promise<IShoppingShipment> {
  // Step 1: Find the shipment by business code, not soft-deleted
  const shipment = await MyGlobal.prisma.shopping_shipments.findFirst({
    where: {
      code: props.code,
      deleted_at: null,
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found or has been deleted.", 404);
  }

  // Step 2: Check seller owns the shipment
  if (shipment.shopping_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this shipment.", 403);
  }

  // Step 3: Perform the update (only allowed fields)
  const updated = await MyGlobal.prisma.shopping_shipments.update({
    where: { code: props.code },
    data: {
      status: props.body.status ?? undefined,
      carrier_company: props.body.carrier_company ?? undefined,
      carrier_service_type: props.body.carrier_service_type ?? undefined,
      scheduled_dispatch_at: props.body.scheduled_dispatch_at ?? undefined,
      dispatched_at: props.body.dispatched_at ?? undefined,
      delivered_at: props.body.delivered_at ?? undefined,
      canceled_at: props.body.canceled_at ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Step 4: Get shopping_order info
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: { id: updated.shopping_order_id },
    select: {
      id: true,
      order_code: true,
      total_price: true,
      status: true,
      created_at: true,
      updated_at: true,
      shopping_customer_id: true,
    },
  });
  if (!order) {
    throw new HttpException("Order not found.", 500);
  }

  // Step 4b: Get customer info by shopping_customer_id
  const customer = await MyGlobal.prisma.shopping_customers.findFirst({
    where: { id: order.shopping_customer_id },
    select: {
      id: true,
      name: true,
      email: true,
      is_active: true,
      created_at: true,
      deleted_at: true,
    },
  });
  if (!customer) {
    throw new HttpException("Customer not found.", 500);
  }

  // Step 5: Get shopping_seller info
  const seller = await MyGlobal.prisma.shopping_sellers.findFirst({
    where: { id: updated.shopping_seller_id },
    select: {
      id: true,
      display_name: true,
      status: true,
    },
  });
  if (!seller) {
    throw new HttpException("Seller not found.", 500);
  }

  // Step 6: Get packages
  const packages = await MyGlobal.prisma.shopping_shipment_packages.findMany({
    where: { shopping_shipment_id: updated.id },
  });

  return {
    id: updated.id,
    code: updated.code,
    shopping_order_id: updated.shopping_order_id,
    shopping_seller_id: updated.shopping_seller_id,
    status: updated.status,
    carrier_company: updated.carrier_company,
    carrier_service_type:
      typeof updated.carrier_service_type === "string"
        ? updated.carrier_service_type
        : null,
    scheduled_dispatch_at: updated.scheduled_dispatch_at
      ? toISOStringSafe(updated.scheduled_dispatch_at)
      : null,
    dispatched_at: updated.dispatched_at
      ? toISOStringSafe(updated.dispatched_at)
      : null,
    delivered_at: updated.delivered_at
      ? toISOStringSafe(updated.delivered_at)
      : null,
    canceled_at: updated.canceled_at
      ? toISOStringSafe(updated.canceled_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    shopping_order: {
      id: order.id,
      order_code: order.order_code,
      total_price: order.total_price,
      status: order.status,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        is_active: customer.is_active,
        created_at: toISOStringSafe(customer.created_at),
        deleted_at: customer.deleted_at
          ? toISOStringSafe(customer.deleted_at)
          : null,
      },
    },
    shopping_seller: {
      id: seller.id,
      display_name: seller.display_name,
      status: seller.status,
    },
    packages: packages.map((pkg) => ({
      id: pkg.id,
      shopping_shipment_id: pkg.shopping_shipment_id,
      sequence: pkg.sequence,
      package_label: pkg.package_label,
      tracking_number: pkg.tracking_number,
      package_weight_grams: pkg.package_weight_grams,
      length_cm: pkg.length_cm,
      width_cm: pkg.width_cm,
      height_cm: pkg.height_cm,
      status: pkg.status,
      delivered_at: pkg.delivered_at ? toISOStringSafe(pkg.delivered_at) : null,
      lost_at: pkg.lost_at ? toISOStringSafe(pkg.lost_at) : null,
      damaged_at: pkg.damaged_at ? toISOStringSafe(pkg.damaged_at) : null,
      created_at: toISOStringSafe(pkg.created_at),
      updated_at: toISOStringSafe(pkg.updated_at),
      deleted_at: pkg.deleted_at ? toISOStringSafe(pkg.deleted_at) : null,
    })),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
