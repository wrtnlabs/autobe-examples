import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminSystemConfigs(props: {
  admin: AdminPayload;
  body: IShoppingMallSystemConfig.ICreate;
}): Promise<IShoppingMallSystemConfig> {
  const { admin, body } = props;

  const now = toISOStringSafe(new Date());

  const category = body.config_key.includes(".")
    ? body.config_key.split(".")[0]
    : "general";

  const inferDataType = (value: string): string => {
    if (value === "true" || value === "false") return "boolean";
    if (!isNaN(Number(value))) {
      return value.includes(".") ? "decimal" : "integer";
    }
    if (value.startsWith("{") || value.startsWith("[")) return "json";
    return "string";
  };

  const generateDescription = (key: string): string => {
    const parts = key.split(".");
    const readable = parts
      .map((part) => part.replace(/_/g, " "))
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" - ");
    return `System configuration: ${readable}`;
  };

  const created = await MyGlobal.prisma.shopping_mall_system_configs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      config_key: body.config_key,
      config_value: body.config_value,
      data_type: inferDataType(body.config_value),
      description: generateDescription(body.config_key),
      category: category,
      is_editable: true,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    config_key: created.config_key,
    config_value: created.config_value,
    description: created.description,
  };
}
