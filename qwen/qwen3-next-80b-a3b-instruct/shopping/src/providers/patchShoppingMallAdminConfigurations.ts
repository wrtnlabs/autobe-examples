import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminConfigurations(props: {
  admin: AdminPayload;
  body: IShoppingMallConfiguration;
}): Promise<IShoppingMallConfiguration> {
  // Fetch existing configuration
  const existing =
    await MyGlobal.prisma.shopping_mall_configurations.findUnique({
      where: { id: "1" },
    });
  if (!existing) {
    throw new HttpException("Configuration not found", 404);
  }
  // Update the configuration
  const updated = await MyGlobal.prisma.shopping_mall_configurations.update({
    where: { id: "1" },
    data: {
      ...props.body,
      updated_at: new Date(),
    },
  });
  // Construct final result with all required properties from IShoppingMallConfiguration
  const resultAsIShoppingMallConfiguration: IShoppingMallConfiguration = {
    // All properties must be present - use props.body as base since it's defined as IShoppingMallConfiguration
    // This ensures all required fields are included
    ...props.body,
    // Preserve non-updated fields from existing
    created_at: toISOStringSafe(existing.created_at),
    // Use updated updated_at from database operation
    updated_at: toISOStringSafe(updated.updated_at),
  };
  return resultAsIShoppingMallConfiguration;
}
