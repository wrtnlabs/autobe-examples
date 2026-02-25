import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShippingCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingCarrier";
import { IShoppingMallShippingCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrier";
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

export async function patchShoppingMallAdminCarriers(props: {
  admin: AdminPayload;
}): Promise<IPageIShoppingMallShippingCarrier.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
  } satisfies Prisma.shopping_mall_shipping_carriersWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipping_carriers.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_shipping_carriers.count({
      where: whereInput,
    }),
  ]);
  return {
    data: data.map((carrier) => ({
      id: carrier.id,
      code: carrier.code,
      name: carrier.name,
      api_endpoint: carrier.api_endpoint,
      is_enabled: carrier.is_enabled,
      created_at: toISOStringSafe(carrier.created_at),
      updated_at: toISOStringSafe(carrier.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
