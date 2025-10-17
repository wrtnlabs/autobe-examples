import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

export async function postShoppingMallShoppingMallConfigurations(props: {
  body: IShoppingMallConfiguration.ICreate;
}): Promise<IShoppingMallConfiguration> {
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_configurations.create({
    data: {
      id: v4(),
      key: props.body.key,
      value: props.body.value,
      category:
        props.body.category === null
          ? null
          : (props.body.category ?? undefined),
      description:
        props.body.description === null
          ? null
          : (props.body.description ?? undefined),
      enabled: props.body.enabled,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    key: created.key,
    value: created.value,
    category: created.category ?? null,
    description: created.description ?? null,
    enabled: created.enabled,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
