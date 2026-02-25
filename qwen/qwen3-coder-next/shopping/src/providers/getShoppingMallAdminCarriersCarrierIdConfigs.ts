import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShippingCarrierConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingCarrierConfig";
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

export async function getShoppingMallAdminCarriersCarrierIdConfigs(props: {
  admin: AdminPayload;
  carrierId: string;
}): Promise<IPageIShoppingMallShippingCarrierConfig> {
  // Validate carrierId format
  try {
    typia.assert<string & tags.Format<"uuid">>(props.carrierId);
  } catch {
    throw new HttpException("Invalid carrierId format", 400);
  }
  // Check carrier exists
  const carrier =
    await MyGlobal.prisma.shopping_mall_shipping_carriers.findUniqueOrThrow({
      where: { id: props.carrierId as string & tags.Format<"uuid"> },
    });
  // Query configurations
  const configs =
    await MyGlobal.prisma.shopping_mall_shipping_carrier_configs.findMany({
      where: { shopping_mall_shipping_carrier_id: props.carrierId },
      ...ShoppingMallShippingCarrierConfigTransformer.select(),
      orderBy: { created_at: "asc" },
    });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    configs,
    ShoppingMallShippingCarrierConfigTransformer.transform,
  );
  return {
    data: data,
    pagination: {
      current: 1,
      limit: 100,
      records: data.length,
      pages: data.length > 0 ? 1 : 0,
    } satisfies IPage.IPagination,
  };
}
