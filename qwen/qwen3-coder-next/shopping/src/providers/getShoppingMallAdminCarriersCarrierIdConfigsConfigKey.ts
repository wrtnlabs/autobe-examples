import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShippingCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrier";
import { IShoppingMallShippingCarrierConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrierConfig";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallShippingCarrierConfigTransformer } from "../transformers/ShoppingMallShippingCarrierConfigTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminCarriersCarrierIdConfigsConfigKey(props: {
  admin: AdminPayload;
  carrierId: string;
  configKey: string;
}): Promise<IShoppingMallShippingCarrierConfig> {
  const config =
    await MyGlobal.prisma.shopping_mall_shipping_carrier_configs.findUniqueOrThrow(
      {
        where: {
          shopping_mall_shipping_carrier_id_key: {
            shopping_mall_shipping_carrier_id: props.carrierId,
            key: props.configKey,
          },
        },
        ...ShoppingMallShippingCarrierConfigTransformer.select(),
      },
    );
  return await ShoppingMallShippingCarrierConfigTransformer.transform(config);
}
