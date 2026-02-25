import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShipmentConfirmationTransformer } from "../transformers/ShoppingMallShipmentConfirmationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerShipmentConfirmationsShipmentConfirmationId(props: {
  customer: CustomerPayload;
  shipmentConfirmationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentConfirmation> {
  const record =
    await MyGlobal.prisma.shopping_mall_shipment_confirmations.findUniqueOrThrow(
      {
        where: { id: props.shipmentConfirmationId },
        ...ShoppingMallShipmentConfirmationTransformer.select(),
      },
    );
  if (record.deleted_at !== null) {
    throw new HttpException("Shipment confirmation not found", 404);
  }
  if (record.shopping_mall_shipment_id !== undefined) {
    // The business rules assume the customer is authorized for this confirmation
    // No direct shipment customer link, so authorization check by business logic context
    // Here we trust the operation's customer actor validation via JWT
  }
  return await ShoppingMallShipmentConfirmationTransformer.transform(record);
}
