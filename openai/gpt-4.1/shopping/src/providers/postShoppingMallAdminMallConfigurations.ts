import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminMallConfigurations(props: {
  admin: AdminPayload;
  body: IShoppingMallConfiguration.ICreate;
}): Promise<IShoppingMallConfiguration> {
  const { config_key, config_value, description, status } = props.body;

  // Check unique constraint
  const exists = await MyGlobal.prisma.shopping_mall_configurations.findFirst({
    where: {
      config_key,
      deleted_at: null,
    },
  });
  if (exists) {
    throw new HttpException(
      "A configuration with the same config_key already exists.",
      409,
    );
  }

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;
  const created = await MyGlobal.prisma.shopping_mall_configurations.create({
    data: {
      id,
      config_key,
      config_value,
      description,
      status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    config_key: created.config_key,
    config_value: created.config_value,
    description: created.description,
    status: typia.assert<"active" | "inactive" | "deprecated">(created.status),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
