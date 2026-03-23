import { IEcommerceMallJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallJobQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallJobQueueTransformer } from "../transformers/EcommerceMallJobQueueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminJobQueuesJobQueueId(props: {
  admin: AdminPayload;
  jobQueueId: string;
}): Promise<IEcommerceMallJobQueue> {
  const jobQueue =
    await MyGlobal.prisma.ecommerce_mall_job_queues.findUniqueOrThrow({
      where: { id: props.jobQueueId },
      ...EcommerceMallJobQueueTransformer.select(),
    });
  return await EcommerceMallJobQueueTransformer.transform(jobQueue);
}
