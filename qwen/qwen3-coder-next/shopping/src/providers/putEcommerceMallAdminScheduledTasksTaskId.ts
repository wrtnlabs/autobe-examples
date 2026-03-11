import { IEcommerceMallScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallScheduledTaskTransformer } from "../transformers/EcommerceMallScheduledTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminScheduledTasksTaskId(props: {
  admin: AdminPayload;
  taskId: string & tags.Format<"uuid">;
  body: IEcommerceMallScheduledTask.IUpdate;
}): Promise<IEcommerceMallScheduledTask> {
  const existing =
    await MyGlobal.prisma.ecommerce_mall_scheduled_tasks.findUniqueOrThrow({
      where: { id: props.taskId },
    });
  const updated = await MyGlobal.prisma.ecommerce_mall_scheduled_tasks.update({
    where: { id: props.taskId },
    data: {
      name: props.body.name ?? undefined,
      description: props.body.description ?? undefined,
      cron_expression: props.body.cron_expression ?? undefined,
      timezone: props.body.timezone ?? undefined,
      timeout_seconds: props.body.timeout_seconds ?? undefined,
      max_retries: props.body.max_retries ?? undefined,
      retry_delay_seconds: props.body.retry_delay_seconds ?? undefined,
      concurrent_policy: props.body.concurrent_policy ?? undefined,
      is_active: props.body.is_active ?? undefined,
      updated_at: new Date().toISOString(),
    },
    ...EcommerceMallScheduledTaskTransformer.select(),
  });
  return await EcommerceMallScheduledTaskTransformer.transform(updated);
}
