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

export async function getShoppingShipmentsCode(props: {
  code: string;
}): Promise<IShoppingShipment> {
  const shipment = await MyGlobal.prisma.shopping_shipments.findFirst({
    where: {
      code: props.code,
      deleted_at: null,
    },
  });
  if (!shipment) throw new HttpException("Shipment not found", 404);

  const order = await MyGlobal.prisma.shopping_orders.findUnique({
    where: {
      id: shipment.shopping_order_id,
      deleted_at: null,
    },
  });
  if (!order) throw new HttpException("Related order not found", 500);

  const customer = await MyGlobal.prisma.shopping_customers.findUnique({
    where: {
      id: order.shopping_customer_id,
      deleted_at: null,
    },
  });
  if (!customer) throw new HttpException("Order's customer not found", 500);

  const seller = await MyGlobal.prisma.shopping_sellers.findUnique({
    where: {
      id: shipment.shopping_seller_id,
      deleted_at: null,
    },
  });
  if (!seller) throw new HttpException("Related seller not found", 500);

  const packages = await MyGlobal.prisma.shopping_shipment_packages.findMany({
    where: {
      shopping_shipment_id: shipment.id,
      deleted_at: null,
    },
    orderBy: { sequence: "asc" },
  });

  return {
    id: shipment.id,
    code: shipment.code,
    shopping_order_id: shipment.shopping_order_id,
    shopping_seller_id: shipment.shopping_seller_id,
    status: shipment.status,
    carrier_company: shipment.carrier_company,
    carrier_service_type:
      shipment.carrier_service_type !== null &&
      shipment.carrier_service_type !== undefined
        ? shipment.carrier_service_type
        : undefined,
    scheduled_dispatch_at: shipment.scheduled_dispatch_at
      ? toISOStringSafe(shipment.scheduled_dispatch_at)
      : undefined,
    dispatched_at: shipment.dispatched_at
      ? toISOStringSafe(shipment.dispatched_at)
      : undefined,
    delivered_at: shipment.delivered_at
      ? toISOStringSafe(shipment.delivered_at)
      : undefined,
    canceled_at: shipment.canceled_at
      ? toISOStringSafe(shipment.canceled_at)
      : undefined,
    created_at: toISOStringSafe(shipment.created_at),
    updated_at: toISOStringSafe(shipment.updated_at),
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
      delivered_at: pkg.delivered_at
        ? toISOStringSafe(pkg.delivered_at)
        : undefined,
      lost_at: pkg.lost_at ? toISOStringSafe(pkg.lost_at) : undefined,
      damaged_at: pkg.damaged_at ? toISOStringSafe(pkg.damaged_at) : undefined,
      created_at: toISOStringSafe(pkg.created_at),
      updated_at: toISOStringSafe(pkg.updated_at),
      deleted_at: pkg.deleted_at ? toISOStringSafe(pkg.deleted_at) : undefined,
    })),
    deleted_at: shipment.deleted_at
      ? toISOStringSafe(shipment.deleted_at)
      : undefined,
  };
}
