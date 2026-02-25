import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import { IShoppingMallSystemConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfigurationValue";
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

export async function putShoppingMallAdminConfigurationsConfigurationId(props: {
  admin: AdminPayload;
  configurationId: string & tags.Format<"uuid">;
  body: IShoppingMallSystemConfigurationValue.ICreate;
}): Promise<IShoppingMallSystemConfigurationValue> {
  const existing =
    await MyGlobal.prisma.shopping_mall_system_configuration_values.findFirst({
      where: { id: props.configurationId, deleted_at: null },
    });
  if (existing === null) {
    throw new HttpException("Configuration not found", 404);
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_system_configuration_values.update({
    where: { id: props.configurationId },
    data: { is_active: false, deleted_at: now },
  });
  const created =
    await MyGlobal.prisma.shopping_mall_system_configuration_values.create({
      data: {
        id: v4(),
        configuration_id: props.body.configuration_id,
        configuration_name:
          props.body.configuration_name ?? existing.configuration_name,
        value_string: null,
        value_integer: null,
        value_double: null,
        value_boolean: null,
        value_datetime: null,
        seller_id: props.body.seller_id ?? existing.seller_id,
        is_active: true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      select: {
        id: true,
        configuration_id: true,
        configuration_name: true,
        value_string: true,
        value_integer: true,
        value_double: true,
        value_boolean: true,
        value_datetime: true,
        seller_id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  await MyGlobal.prisma.shopping_mall_system_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "admin",
      actor_id: props.admin.id,
      operation_type: "update",
      entity_type: "shopping_mall_system_configuration_values",
      entity_id: created.id,
      ip_address: props.admin.id,
      user_agent: props.admin.id,
      old_values: JSON.stringify({ id: existing.id }),
      new_values: JSON.stringify({ id: created.id }),
      description: JSON.stringify({ before: existing.id, after: created.id }),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    configuration: {
      id: existing.configuration_id,
      config_key: "",
      category: null,
      is_enabled: true,
      description: null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
    configuration_id: created.configuration_id,
    configuration_name: created.configuration_name,
    value_string: created.value_string ?? undefined,
    value_integer: created.value_integer ?? undefined,
    value_double: created.value_double ?? undefined,
    value_boolean: created.value_boolean ?? undefined,
    value_datetime: created.value_datetime
      ? created.value_datetime.toISOString()
      : undefined,
    seller_id: created.seller_id ?? undefined,
    is_active: created.is_active,
    created_at: created.created_at.toISOString(),
    updated_at: created.updated_at.toISOString(),
    deleted_at: created.deleted_at
      ? created.deleted_at.toISOString()
      : undefined,
  };
}
