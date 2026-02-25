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

export async function getShoppingMallAdminCarriersCarrierId(props: {
  admin: AdminPayload;
  carrierId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShippingCarrier> {
  const carrier =
    await MyGlobal.prisma.shopping_mall_shipping_carriers.findUniqueOrThrow({
      where: { id: props.carrierId },
      ...ShoppingMallShippingCarrierTransformer.select(),
    });
  return await ShoppingMallShippingCarrierTransformer.transform(carrier);
}
