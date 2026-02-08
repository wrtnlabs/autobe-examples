import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
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

export async function postShoppingMallSellerShipmentsShipmentIdOrderItems(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentOrderItem.ICreate;
}): Promise<IShoppingMallShipmentOrderItem.ISummary> {
  // The ICreate DTO is empty, so we cannot determine order items to add without additional data.
  // According to operation description, the request body should contain order item IDs,
  // but schema is empty and cannot be used to get data.
  throw new Error("Request body does not contain order item IDs to add.");
}
