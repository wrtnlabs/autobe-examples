import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipmentTrackingHistoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentTrackingHistoryLog";
import { IShoppingMallShipmentTrackingHistoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingHistoryLog";
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

export async function patchShoppingMallSellerShipmentsTrackingHistory(props: {
  seller: SellerPayload;
  body: IShoppingMallShipmentTrackingHistoryLog.IRequest;
}): Promise<IPageIShoppingMallShipmentTrackingHistoryLog> {
  // Implementation should be handled by database agent
  // This function is just a placeholder
  return null as any;
}
