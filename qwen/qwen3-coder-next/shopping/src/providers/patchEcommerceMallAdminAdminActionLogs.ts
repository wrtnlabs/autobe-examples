import { IEcommerceMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminActionLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminActionLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminActionLogAtSummaryTransformer } from "../transformers/EcommerceMallAdminActionLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminActionLogs(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminActionLog.IRequest;
}): Promise<IPageIEcommerceMallAdminActionLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.created_at_after &&
      props.body.created_at_before && {
        created_at: {
          gte: new Date(props.body.created_at_after),
          lte: new Date(props.body.created_at_before),
        },
      }),
    ...(props.body.created_at_after &&
      !props.body.created_at_before && {
        created_at: { gte: new Date(props.body.created_at_after) },
      }),
    ...(props.body.created_at_before &&
      !props.body.created_at_after && {
        created_at: { lte: new Date(props.body.created_at_before) },
      }),
    ...(props.body.target_id && { target_id: props.body.target_id }),
    ...(props.body.admin_id && {
      ecommerce_mall_admin_id: props.body.admin_id,
    }),
  } satisfies Prisma.ecommerce_mall_admin_action_logsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_admin_action_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceMallAdminActionLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_admin_action_logs.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallAdminActionLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
