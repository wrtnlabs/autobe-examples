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

export async function postShoppingMallAdminCarriers(props: {
  admin: AdminPayload;
  body: IShoppingMallShippingCarrier.ICreate;
}): Promise<IShoppingMallShippingCarrier> {
  // Check if carrier code already exists
  const existing =
    await MyGlobal.prisma.shopping_mall_shipping_carriers.findUnique({
      where: { code: props.body.code },
    });
  if (existing) {
    throw new HttpException("Carrier code already exists", 409);
  }
  // Create the carrier with proper types
  const created = await MyGlobal.prisma.shopping_mall_shipping_carriers.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      code: props.body.code,
      name: props.body.name,
      api_endpoint: props.body.api_endpoint,
      api_key: props.body.api_key,
      api_secret: props.body.api_secret,
      account_number: props.body.account_number ?? null,
      is_enabled: props.body.is_enabled,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null as (string & tags.Format<"date-time">) | null,
    },
    ...ShoppingMallShippingCarrierTransformer.select(),
  });
  return await ShoppingMallShippingCarrierTransformer.transform(created);
}
