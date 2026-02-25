import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShippingCarrierConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrierConfig";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminCarriersCarrierIdConfigs(props: {
  admin: AdminPayload;
  carrierId: string & tags.Format<"uuid">;
  body: IShoppingMallShippingCarrierConfig.IRequest;
}): Promise<IShoppingMallShippingCarrierConfig.IRequest> {
  // Validate carrier exists
  await MyGlobal.prisma.shopping_mall_shipping_carriers.findUniqueOrThrow({
    where: { id: props.carrierId },
  });
  // Upsert each configuration key-value pair
  const promises = Object.entries(props.body).map(async ([key, value]) => {
    return MyGlobal.prisma.shopping_mall_shipping_carrier_configs.upsert({
      where: {
        shopping_mall_shipping_carrier_id_key: {
          shopping_mall_shipping_carrier_id: props.carrierId,
          key: key,
        },
      },
      create: {
        id: v4(),
        shopping_mall_shipping_carrier_id: props.carrierId,
        key: key,
        value: value,
        created_at: new Date(),
        updated_at: new Date(),
      },
      update: {
        value: value,
        updated_at: new Date(),
      },
    });
  });
  await Promise.all(promises);
  return props.body;
}
