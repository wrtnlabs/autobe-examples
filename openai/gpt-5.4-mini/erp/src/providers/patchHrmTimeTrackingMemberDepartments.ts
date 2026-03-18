import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberDepartments(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingDepartment.IRequest;
}): Promise<IPageIHrmTimeTrackingDepartment.ISummary> {
  if (props.member.type !== "member") {
    throw new HttpException("Forbidden", 403);
  }
  const organizationId = (
    props.member as MemberPayload & {
      hrm_time_tracking_organization_id?: string & tags.Format<"uuid">;
    }
  ).hrm_time_tracking_organization_id;
  if (organizationId === undefined) {
    throw new HttpException("Selected organization context is required", 400);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const search = props.body.search?.trim();
  const where = {
    hrm_time_tracking_organization_id: organizationId,
    deleted_at: null,
    ...(search !== undefined && search.length > 0
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.hrm_time_tracking_departmentsWhereInput;
  const orderBy = (
    props.body.sort === "created_at"
      ? { created_at: props.body.order ?? "asc" }
      : props.body.sort === "updated_at"
        ? { updated_at: props.body.order ?? "asc" }
        : props.body.sort === "name"
          ? { name: props.body.order ?? "asc" }
          : { name: "asc" as const }
  ) satisfies Prisma.hrm_time_tracking_departmentsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.hrm_time_tracking_departments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      name: true,
      description: true,
      parent_department_id: true,
      created_at: true,
      updated_at: true,
    },
  });
  const records = await MyGlobal.prisma.hrm_time_tracking_departments.count({
    where,
  });
  return {
    data: data.map(
      (item): IHrmTimeTrackingDepartment.ISummary => ({
        id: item.id,
        name: item.name,
        description: item.description,
        parentDepartmentId: item.parent_department_id,
        created_at: item.created_at.toISOString(),
        updated_at: item.updated_at.toISOString(),
      }),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    },
  };
}
