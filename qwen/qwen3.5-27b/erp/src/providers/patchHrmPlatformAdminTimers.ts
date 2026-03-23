import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformTimerAtSummaryTransformer } from "../transformers/HrmPlatformTimerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformAdminTimers(props: {
  admin: AdminPayload;
  body: IHrmPlatformTimer.IRequest;
}): Promise<IPageIHrmPlatformTimer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_timersWhereInput = {
    deleted_at: null,
  };
  if (props.body.status !== undefined) {
    if (props.body.status === "active") {
      whereInput.stopped_at = null;
    } else if (props.body.status === "stopped") {
      whereInput.stopped_at = { not: null };
    }
  }
  if (props.body.start_date !== undefined) {
    if (props.body.end_date !== undefined) {
      whereInput.started_at = {
        gte: new Date(props.body.start_date),
        lte: new Date(props.body.end_date),
      };
    } else {
      whereInput.started_at = {
        gte: new Date(props.body.start_date),
      };
    }
  } else if (props.body.end_date !== undefined) {
    whereInput.started_at = {
      lte: new Date(props.body.end_date),
    };
  }
  if (props.body.project_id !== undefined) {
    whereInput.hrm_platform_project_id = props.body.project_id;
  }
  if (props.body.task_id !== undefined) {
    whereInput.hrm_platform_task_id = props.body.task_id;
  }
  if (props.body.search !== undefined) {
    whereInput.description = {
      contains: props.body.search,
    };
  }
  const orderByInput: Prisma.hrm_platform_timersOrderByWithRelationInput =
    props.body.sort === "started_at"
      ? { started_at: props.body.order ?? "desc" }
      : props.body.sort === "stopped_at"
        ? { stopped_at: props.body.order ?? "desc" }
        : { created_at: props.body.order ?? "desc" };
  const data = await MyGlobal.prisma.hrm_platform_timers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformTimerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_timers.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformTimerAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
