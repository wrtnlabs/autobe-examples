import { IEcommerceMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotificationQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallNotificationQueue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallNotificationQueueTransformer } from "../transformers/EcommerceMallNotificationQueueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminNotificationQueues(props: {
  admin: AdminPayload;
  body: IEcommerceMallNotificationQueue.IRequest;
}): Promise<IPageIEcommerceMallNotificationQueue.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions
  const whereConditions: Prisma.ecommerce_mall_notification_queuesWhereInput = {
    ...(props.body.type && { type: props.body.type }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.user_id && { user_id: props.body.user_id }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.updated_at_from && {
      updated_at: { gte: new Date(props.body.updated_at_from) },
    }),
    ...(props.body.updated_at_to && {
      updated_at: { lte: new Date(props.body.updated_at_to) },
    }),
    ...(props.body.has_error === true && {
      error_message: { not: null },
    }),
    ...(props.body.has_error === false && {
      error_message: null,
    }),
    ...(props.body.error_message && {
      error_message: { contains: props.body.error_message },
    }),
  };
  // Fetch data
  const data =
    await MyGlobal.prisma.ecommerce_mall_notification_queues.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallNotificationQueueTransformer.select(),
    });
  // Fetch total count
  const total = await MyGlobal.prisma.ecommerce_mall_notification_queues.count({
    where: whereConditions,
  });
  // Transform to response format
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallNotificationQueueTransformer.transform,
  );
  // Build pagination
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    pagination: pagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallNotificationQueue.ISummary;
}
