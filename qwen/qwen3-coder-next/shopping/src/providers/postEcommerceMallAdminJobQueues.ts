import { IEcommerceMallJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallJobQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallJobQueueCollector } from "../collectors/EcommerceMallJobQueueCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallJobQueueTransformer } from "../transformers/EcommerceMallJobQueueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminJobQueues(props: {
  admin: AdminPayload;
  body: IEcommerceMallJobQueue.ICreate;
}): Promise<IEcommerceMallJobQueue> {
  const created = await MyGlobal.prisma.ecommerce_mall_job_queues.create({
    data: await EcommerceMallJobQueueCollector.collect({
      body: props.body,
    }),
    ...EcommerceMallJobQueueTransformer.select(),
  });
  return await EcommerceMallJobQueueTransformer.transform(created);
}
