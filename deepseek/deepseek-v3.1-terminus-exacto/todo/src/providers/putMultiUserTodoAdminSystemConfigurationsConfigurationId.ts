import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoSystemConfigurationTransformer } from "../transformers/MultiUserTodoSystemConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMultiUserTodoAdminSystemConfigurationsConfigurationId(props: {
  admin: AdminPayload;
  configurationId: string & tags.Format<"uuid">;
  body: IMultiUserTodoSystemConfiguration.IUpdate;
}): Promise<IMultiUserTodoSystemConfiguration> {
  // Verify configuration exists
  await MyGlobal.prisma.multi_user_todo_system_configurations.findUniqueOrThrow(
    {
      where: { id: props.configurationId },
    },
  );
  // Apply update with conditional fields
  const updated =
    await MyGlobal.prisma.multi_user_todo_system_configurations.update({
      where: { id: props.configurationId },
      data: {
        ...(props.body.config_value !== undefined && {
          config_value: props.body.config_value,
        }),
        ...(props.body.data_type !== undefined && {
          data_type: props.body.data_type,
        }),
        ...(props.body.scope !== undefined && { scope: props.body.scope }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.is_active !== undefined && {
          is_active: props.body.is_active,
        }),
        version: { increment: 1 },
        updated_at: new Date(),
      },
      ...MultiUserTodoSystemConfigurationTransformer.select(),
    });
  return await MultiUserTodoSystemConfigurationTransformer.transform(updated);
}
