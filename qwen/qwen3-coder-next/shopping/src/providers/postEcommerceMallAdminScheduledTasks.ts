import { IEcommerceMallScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallScheduledTaskCollector } from "../collectors/EcommerceMallScheduledTaskCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallScheduledTaskTransformer } from "../transformers/EcommerceMallScheduledTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminScheduledTasks(props: {
  admin: AdminPayload;
  body: IEcommerceMallScheduledTask.ICreate;
}): Promise<IEcommerceMallScheduledTask> {
  typia.assert<IEcommerceMallScheduledTask.ICreate>(props.body);
  const task = await MyGlobal.prisma.ecommerce_mall_scheduled_tasks.create({
    data: await EcommerceMallScheduledTaskCollector.collect({
      body: props.body,
    }),
    ...EcommerceMallScheduledTaskTransformer.select(),
  });
  return await EcommerceMallScheduledTaskTransformer.transform(task);
}
