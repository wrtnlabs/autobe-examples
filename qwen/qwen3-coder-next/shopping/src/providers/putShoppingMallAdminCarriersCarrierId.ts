import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShippingCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrier";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallShippingCarrierTransformer } from "../transformers/ShoppingMallShippingCarrierTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminCarriersCarrierId(props: {
  admin: AdminPayload;
  carrierId: string & tags.Format<"uuid">;
  body: IShoppingMallShippingCarrier.IUpdate;
}): Promise<IShoppingMallShippingCarrier> {
  // Validate carrier exists
  const existing =
    await MyGlobal.prisma.shopping_mall_shipping_carriers.findUniqueOrThrow({
      where: { id: props.carrierId },
    });
  // Update the carrier configuration
  const updated = await MyGlobal.prisma.shopping_mall_shipping_carriers.update({
    where: { id: props.carrierId },
    data: {
      name: props.body.name ?? existing.name,
      api_endpoint: props.body.api_endpoint ?? existing.api_endpoint,
      api_key: props.body.api_key ?? existing.api_key,
      api_secret: props.body.api_secret ?? existing.api_secret,
      account_number: props.body.account_number ?? existing.account_number,
      is_enabled: props.body.is_enabled ?? existing.is_enabled,
      updated_at: new Date(),
    },
    ...ShoppingMallShippingCarrierTransformer.select(),
  });
  // Transform to response DTO
  return await ShoppingMallShippingCarrierTransformer.transform(updated);
}
