import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimerAtSummaryTransformer } from "../transformers/ErpHrmTimerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberTimers(props: {
  member: MemberPayload;
  body: IErpHrmTimer.IRequest;
}): Promise<IPageIErpHrmTimer.ISummary> {
  // Get organization member for the authenticated user
  const organizationMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
      },
    });
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build date range condition for started_at
  const startedAtCondition:
    | {
        gte?: Date;
        lte?: Date;
      }
    | undefined =
    (props.body.startedAtFrom !== undefined &&
      props.body.startedAtFrom !== null) ||
    (props.body.startedAtUntil !== undefined &&
      props.body.startedAtUntil !== null)
      ? {
          ...(props.body.startedAtFrom !== undefined &&
            props.body.startedAtFrom !== null && {
              gte: new Date(props.body.startedAtFrom),
            }),
          ...(props.body.startedAtUntil !== undefined &&
            props.body.startedAtUntil !== null && {
              lte: new Date(props.body.startedAtUntil),
            }),
        }
      : undefined;
  // Build where clause
  const whereInput = {
    organizationMember: {
      organization_id: organizationMember.organization_id,
      deleted_at: null,
    },
    ...(props.body.projectId !== undefined && {
      project_id: props.body.projectId,
    }),
    ...(props.body.taskId !== undefined && { task_id: props.body.taskId }),
    ...(props.body.description !== undefined && {
      description: {
        contains: props.body.description,
        mode: "insensitive" as const,
      },
    }),
    ...(startedAtCondition !== undefined && { started_at: startedAtCondition }),
  } satisfies Prisma.erp_hrm_timersWhereInput;
  // Parse sort parameter
  const orderByInput = (
    props.body.sort !== undefined && props.body.sort.startsWith("-")
      ? { started_at: "desc" as const }
      : props.body.sort === "started_at"
        ? { started_at: "asc" as const }
        : { started_at: "desc" as const }
  ) satisfies Prisma.erp_hrm_timersOrderByWithRelationInput;
  // Query timers with pagination
  const timers = await MyGlobal.prisma.erp_hrm_timers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmTimerAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.erp_hrm_timers.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    timers,
    ErpHrmTimerAtSummaryTransformer.transform,
  );
  // Build paginated response
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
