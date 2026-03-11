import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
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

export async function getEcommerceMallSellerShipmentsShipmentIdItems(props: {
  seller: SellerPayload;
  shipmentId: string;
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: { ecommerce_mall_seller_id: true },
    });
  if (shipment.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const shipmentItems =
    await MyGlobal.prisma.ecommerce_mall_shipment_items.findMany({
      where: { shipment_id: props.shipmentId },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
      },
    });
  return {
    pagination: {
      current: 1,
      limit: 100,
      records: shipmentItems.length,
      pages: 1,
    } satisfies IPage.IPagination,
    data: shipmentItems.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      tracking_number: null,
      carrier_name: null,
      shipment_status: "pending",
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: null,
      seller: {
        id: props.seller.id as string & tags.Format<"uuid">,
        shop_name: "",
        approval_status: "approved",
        is_suspended: false,
        created_at: toISOStringSafe(new Date()),
      },
    })),
  };
}
