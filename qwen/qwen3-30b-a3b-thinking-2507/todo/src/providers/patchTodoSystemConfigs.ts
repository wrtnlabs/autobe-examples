import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoSystemConfig";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoSystemConfigTransformer } from "../transformers/TodoSystemConfigTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoSystemConfigs(props: {
  body: ITodoSystemConfig.IRequest;
}): Promise<ITodoSystemConfig> {
  const existing = await MyGlobal.prisma.todo_system_configs.findFirst({
    where: { deleted_at: null },
    ...TodoSystemConfigTransformer.select(),
  });
  if (!existing) {
    throw new HttpException("System config not found", 404);
  }
  const updateData: any = {};
  if (props.body.email_verification_timeout !== undefined) {
    updateData.email_verification_timeout =
      props.body.email_verification_timeout;
  }
  if (props.body.password_reset_timeout !== undefined) {
    updateData.password_reset_timeout = props.body.password_reset_timeout;
  }
  if (props.body.feature_flags !== undefined) {
    updateData.feature_flags = props.body.feature_flags;
  }
  updateData.updated_at = new Date();
  const updatedRecord = await MyGlobal.prisma.todo_system_configs.update({
    where: { id: existing.id },
    data: updateData,
    ...TodoSystemConfigTransformer.select(),
  });
  return await TodoSystemConfigTransformer.transform(updatedRecord);
}
