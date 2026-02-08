import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallSystemSettingsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const deleted = await MyGlobal.prisma.shopping_mall_system_settings
    .delete({
      where: { id: props.id },
    })
    .catch((error) => {
      if (error.code === "P2025") {
        // Prisma specific error code for record not found
        throw new HttpException("System setting not found", 404);
      }
      throw new HttpException("Internal server error", 500);
    });
  // No return data, just void on successful deletion
  return;
}
