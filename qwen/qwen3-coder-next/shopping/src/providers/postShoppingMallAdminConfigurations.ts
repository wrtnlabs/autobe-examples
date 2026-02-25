import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
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

export async function postShoppingMallAdminConfigurations(props: {
  admin: AdminPayload;
  body: IShoppingMallSystemConfiguration.ICreate;
}): Promise<IShoppingMallSystemConfiguration> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const config =
    await MyGlobal.prisma.shopping_mall_system_configurations.create({
      data: {
        id: v4(),
        config_key: props.body.config_key,
        category: props.body.category ?? null,
        is_enabled: props.body.is_enabled,
        description: props.body.description ?? null,
        updated_by: props.body.updated_by ?? null,
        created_at: now,
        updated_at: now,
      },
      select: {
        id: true,
        config_key: true,
        category: true,
        is_enabled: true,
        description: true,
        updated_by: true,
        created_at: true,
        updated_at: true,
      },
    });
  return config as unknown as IShoppingMallSystemConfiguration;
}
