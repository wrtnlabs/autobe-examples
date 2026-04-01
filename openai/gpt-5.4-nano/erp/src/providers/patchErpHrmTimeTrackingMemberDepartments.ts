import { IAutoBePaginationSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IAutoBePaginationSearch";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingDepartment";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingDepartmentAtSummaryTransformer } from "../transformers/ErpHrmTimeTrackingDepartmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingMemberDepartments(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingDepartment.IRequest;
}): Promise<IPageIErpHrmTimeTrackingDepartment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // MemberPayload may expose the organization id via different paths.
  const organizationId =
    (
      props.member as unknown as {
        erp_hrm_time_tracking_organization_id?: string | null;
        erp_hrm_time_tracking_organization?: {
          id?: string | null;
        } | null;
      }
    ).erp_hrm_time_tracking_organization_id ??
    (
      props.member as unknown as {
        erp_hrm_time_tracking_organization?: {
          id?: string | null;
        } | null;
      }
    ).erp_hrm_time_tracking_organization?.id ??
    null;
  const where = {
    deleted_at: null,
    ...(organizationId !== null &&
      organizationId !== undefined && {
        erp_hrm_time_tracking_organization_id: organizationId,
      }),
    ...(props.body.name !== undefined && {
      name: { contains: props.body.name, mode: "insensitive" as const },
    }),
    ...(props.body.description !== undefined && props.body.description !== null
      ? {
          description: {
            contains: props.body.description,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(props.body.parent_department_id !== undefined &&
    props.body.parent_department_id !== null
      ? { parent_department_id: props.body.parent_department_id }
      : {}),
  } satisfies Prisma.erp_hrm_time_tracking_departmentsWhereInput;
  const orderBy = (() => {
    if (props.body.sort === "name_asc") {
      return { name: "asc" as const };
    }
    if (props.body.sort === "name_desc") {
      return { name: "desc" as const };
    }
    if (props.body.sort === "created_at_desc") {
      return { created_at: "desc" as const };
    }
    return { updated_at: "desc" as const, id: "asc" as const };
  })() satisfies Prisma.erp_hrm_time_tracking_departmentsOrderByWithRelationInput;
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.erp_hrm_time_tracking_departments.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...ErpHrmTimeTrackingDepartmentAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.erp_hrm_time_tracking_departments.count({ where }),
  ]);
  const data = await Promise.all(
    rows.map((row) =>
      ErpHrmTimeTrackingDepartmentAtSummaryTransformer.transform(row),
    ),
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
