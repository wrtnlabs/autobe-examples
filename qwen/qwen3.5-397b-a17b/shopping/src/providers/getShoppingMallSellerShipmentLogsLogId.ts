import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentLogTransformer } from "../transformers/ShoppingMallShipmentLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerShipmentLogsLogId(props: {
  seller: SellerPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentLog> {
  const log =
    await MyGlobal.prisma.shopping_mall_shipment_logs.findUniqueOrThrow({
      where: { id: props.logId },
      ...ShoppingMallShipmentLogTransformer.select(),
    });
  if (log.shipment.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallShipmentLogTransformer.transform(log);
}
