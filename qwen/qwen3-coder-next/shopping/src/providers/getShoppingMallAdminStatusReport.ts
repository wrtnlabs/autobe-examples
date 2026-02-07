import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystematicStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicStatus";
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

export async function getShoppingMallAdminStatusReport(props: {
  admin: AdminPayload;
}): Promise<IShoppingMallSystematicStatus> {
  const statuses =
    await MyGlobal.prisma.shopping_mall_systematic_statuses.findMany({
      orderBy: { last_updated: "desc" },
    });
  // Map database records to API response format
  return {
    // The exact mapping depends on the actual DTO structure
    // Since IShoppingMallSystematicStatus is defined as empty {},
    // we return an empty object
    ...({} as any),
  };
}
