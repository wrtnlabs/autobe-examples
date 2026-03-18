import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmActivityLogAtSummaryTransformer } from "../transformers/ErpHrmActivityLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberActivityLogs(props: {
  member: MemberPayload;
  body: IErpHrmActivityLog.IRequest;
}): Promise<IPageIErpHrmActivityLog.ISummary> {
  // Step 1: Resolve organization_id from the authenticated member's org member record
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    });
  const { body } = props;
  // Step 2: Build where input
  const whereInput = {
    organization_id: orgMember.organization_id,
    ...(body.action_type &&
      body.action_type.length > 0 && {
        action_type: { in: body.action_type },
      }),
    ...(body.target_entity_type &&
      body.target_entity_type.length > 0 && {
        target_entity_type: { in: body.target_entity_type },
      }),
    ...(body.target_entity_id !== undefined && {
      target_entity_id: body.target_entity_id,
    }),
    ...(body.organization_member_id !== undefined && {
      organization_member_id: body.organization_member_id,
    }),
    ...((body.created_at_from !== undefined ||
      body.created_at_to !== undefined) && {
      created_at: {
        ...(body.created_at_from !== undefined && {
          gte: body.created_at_from,
        }),
        ...(body.created_at_to !== undefined && { lte: body.created_at_to }),
      },
    }),
  } satisfies Prisma.erp_hrm_activity_logsWhereInput;
  // Step 3: Compute pagination (normalize to valid bounds)
  const page = Math.max(1, body.page ?? body.pagination?.page ?? 1);
  const limit = Math.max(1, body.limit ?? body.pagination?.limit ?? 20);
  const skip = (page - 1) * limit;
  // Step 4: Build order by using ternary for strong typing
  const orderByInput = (
    body.sort?.field === "action_type"
      ? {
          action_type:
            body.sort?.direction === "asc"
              ? ("asc" as const)
              : ("desc" as const),
        }
      : {
          created_at:
            body.sort?.direction === "asc"
              ? ("asc" as const)
              : ("desc" as const),
        }
  ) satisfies Prisma.erp_hrm_activity_logsOrderByWithRelationInput;
  // Step 5: Fetch paginated data
  const data = await MyGlobal.prisma.erp_hrm_activity_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmActivityLogAtSummaryTransformer.select(),
  });
  // Step 6: Count total records (sequential after findMany)
  const total = await MyGlobal.prisma.erp_hrm_activity_logs.count({
    where: whereInput,
  });
  // Step 7: Transform results using the existing transformer
  const transformed = await ArrayUtil.asyncMap(
    data,
    ErpHrmActivityLogAtSummaryTransformer.transform,
  );
  // Step 8: Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  };
}
