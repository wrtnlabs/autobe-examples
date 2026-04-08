import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmActivityLogAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActivityLogAnalytic";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmMemberAtSummaryTransformer } from "../transformers/HrmMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmMemberOrganizationsOrganizationIdActivityLogsAnalytics(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHrmActivityLogAnalytic> {
  // 1. Verify organization exists
  const organization = await MyGlobal.prisma.hrm_organizations.findUnique({
    where: { id: props.organizationId, deleted_at: null },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // 2. Get member's employee record in this organization
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      organization_id: props.organizationId,
      user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Not a member of this organization", 403);
  }
  // 3. Check org:manage permission through role
  const hasManagePermission =
    await MyGlobal.prisma.hrm_role_permissions.findFirst({
      where: {
        hrm_role_id: employee.role_id,
        hrmPermission: {
          permission_name: "org:manage",
        },
      },
    });
  if (hasManagePermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Get total count of activity logs for this organization
  const totalCount = await MyGlobal.prisma.hrm_activity_logs.count({
    where: {
      hrmMember: {
        employee: {
          organization_id: props.organizationId,
          deleted_at: null,
        },
      },
      deleted_at: null,
    },
  });
  // 5. Aggregate action_type_counts
  const actionTypeGroups = await MyGlobal.prisma.hrm_activity_logs.groupBy({
    by: ["action_type"],
    where: {
      hrmMember: {
        employee: {
          organization_id: props.organizationId,
          deleted_at: null,
        },
      },
      deleted_at: null,
    },
    _count: {
      action_type: true,
    },
  });
  const actionTypeCounts: {
    [key: string]: number & tags.Type<"int32">;
  } = {};
  for (const group of actionTypeGroups) {
    const count = (group._count?.action_type ?? 0) as number &
      tags.Type<"int32">;
    actionTypeCounts[group.action_type] = count;
  }
  // 6. Get top performers with member info
  const topPerformerGroups = await MyGlobal.prisma.hrm_activity_logs.groupBy({
    by: ["hrm_members_id"],
    where: {
      hrmMember: {
        employee: {
          organization_id: props.organizationId,
          deleted_at: null,
        },
      },
      deleted_at: null,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
    take: 10,
  });
  const topPerformers = await ArrayUtil.asyncMap(
    topPerformerGroups,
    async (group) => {
      const memberPayload = await MyGlobal.prisma.hrm_members.findUnique({
        where: { id: group.hrm_members_id, deleted_at: null },
        ...HrmMemberAtSummaryTransformer.select(),
      });
      if (memberPayload === null) {
        return null;
      }
      return {
        member: await HrmMemberAtSummaryTransformer.transform(memberPayload),
        activity_count: (group._count?.id ?? 0) as number & tags.Type<"int32">,
      };
    },
  );
  // Filter out any null members
  const validTopPerformers = topPerformers.filter(
    (performer): performer is NonNullable<typeof performer> =>
      performer !== null,
  );
  // 7. Get temporal trends using Prisma groupBy (no raw SQL)
  const temporalTrendGroups = await MyGlobal.prisma.hrm_activity_logs.groupBy({
    by: ["timestamp"],
    where: {
      hrmMember: {
        employee: {
          organization_id: props.organizationId,
          deleted_at: null,
        },
      },
      deleted_at: null,
    },
    _count: {
      id: true,
    },
    orderBy: {
      timestamp: "desc",
    },
    take: 30,
  });
  const temporalTrends: IHrmActivityLogAnalytic.ITemporalTrend[] =
    temporalTrendGroups.map((group) => ({
      period: group.timestamp.toISOString() as string &
        tags.Format<"date-time">,
      count: (group._count?.id ?? 0) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    }));
  return {
    action_type_counts: actionTypeCounts,
    temporal_trends: temporalTrends,
    top_performers: validTopPerformers,
    total_count: totalCount as number & tags.Type<"int32">,
  } satisfies IHrmActivityLogAnalytic;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmActivityLogAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActivityLogAnalytic";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberOrganizationsOrganizationIdActivityLogsAnalytics(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
// }): Promise<IHrmActivityLogAnalytic> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------