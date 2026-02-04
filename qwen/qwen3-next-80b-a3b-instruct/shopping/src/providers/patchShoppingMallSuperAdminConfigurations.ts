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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";

export async function patchShoppingMallSuperAdminConfigurations(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallConfiguration;
}): Promise<IShoppingMallConfiguration> {
  const existing = await MyGlobal.prisma.shopping_mall_configurations.findFirst(
    {
      where: {
        id: { not: undefined },
      },
    },
  );
  if (!existing) {
    throw new HttpException("Configuration record not found", 404);
  }
  const updated = await MyGlobal.prisma.shopping_mall_configurations.update({
    where: { id: existing.id },
    data: {
      ...props.body,
    },
  });
  // Combine Prisma result with body to ensure all IShoppingMallConfiguration properties are present
  return {
    ...updated,
    ...props.body,
  } satisfies IShoppingMallConfiguration as IShoppingMallConfiguration;
}
