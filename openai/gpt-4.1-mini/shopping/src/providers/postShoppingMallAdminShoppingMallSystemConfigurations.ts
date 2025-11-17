import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminShoppingMallSystemConfigurations(props: {
  admin: AdminPayload;
  body: IShoppingMallSystemConfiguration.ICreate;
}): Promise<IShoppingMallSystemConfiguration> {
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_system_configurations.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        key: props.body.key,
        value: props.body.value,
        description: props.body.description,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    key: created.key,
    value: created.value,
    description: created.description,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
