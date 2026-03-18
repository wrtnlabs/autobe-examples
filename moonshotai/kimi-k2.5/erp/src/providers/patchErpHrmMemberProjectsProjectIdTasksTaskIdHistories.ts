import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmMemberAtSummaryTransformer } from "../transformers/ErpHrmMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberProjectsProjectIdTasksTaskIdHistories(props: {
  member: MemberPayload;
  projectId: string;
  taskId: string;
  body: IErpHrmTaskHistory.IRequest;
}): Promise<IPageIErpHrmTaskHistory.ISummary> {
  // Verify task exists in the specified project
  await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      project_id: props.projectId,
      deleted_at: null,
    },
  });
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build date range filter
  const dateRangeFilter = (() => {
    const conditions: Array<{
      created_at: {
        gte?: Date;
        lte?: Date;
      };
    }> = [];
    if (props.body.startDate) {
      conditions.push({ created_at: { gte: new Date(props.body.startDate) } });
    }
    if (props.body.endDate) {
      conditions.push({ created_at: { lte: new Date(props.body.endDate) } });
    }
    if (conditions.length === 0) return {};
    if (conditions.length === 1) return conditions[0];
    return { AND: conditions };
  })();
  // Build where clause with filters
  const whereInput = {
    erp_hrm_task_id: props.taskId,
    ...(props.body.search && {
      change_reason: { contains: props.body.search },
    }),
    ...(props.body.status && {
      OR: [
        { previous_status: props.body.status },
        { new_status: props.body.status },
      ],
    }),
    ...dateRangeFilter,
    ...(props.body.changedByMemberId && {
      erp_hrm_member_id: props.body.changedByMemberId,
    }),
  } satisfies Prisma.erp_hrm_task_historiesWhereInput;
  // Parse sort parameter (format: 'field:direction')
  const orderByInput =
    ((): Prisma.erp_hrm_task_historiesOrderByWithRelationInput => {
      if (!props.body.sort) {
        return { created_at: "desc" };
      }
      const [field, direction] = props.body.sort.split(":");
      if (field === "created_at") {
        return { created_at: direction === "asc" ? "asc" : "desc" };
      }
      if (field === "previous_status") {
        return { previous_status: direction === "asc" ? "asc" : "desc" };
      }
      if (field === "new_status") {
        return { new_status: direction === "asc" ? "asc" : "desc" };
      }
      return { created_at: "desc" };
    })();
  // Fetch paginated data and count
  const [histories, total] = await Promise.all([
    MyGlobal.prisma.erp_hrm_task_histories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        previous_status: true,
        new_status: true,
        change_reason: true,
        created_at: true,
        changedByMember: ErpHrmMemberAtSummaryTransformer.select(),
      },
    }),
    MyGlobal.prisma.erp_hrm_task_histories.count({
      where: whereInput,
    }),
  ]);
  // Transform to response DTO
  const data = await ArrayUtil.asyncMap(
    histories,
    async (history): Promise<IErpHrmTaskHistory.ISummary> => ({
      id: history.id,
      previous_status: history.previous_status,
      new_status: history.new_status,
      change_reason: history.change_reason ?? null,
      changed_by: await ErpHrmMemberAtSummaryTransformer.transform(
        history.changedByMember,
      ),
      created_at: history.created_at.toISOString(),
    }),
  );
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
