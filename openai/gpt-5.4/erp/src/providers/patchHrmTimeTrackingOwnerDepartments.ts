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
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingDepartmentAtSummaryTransformer } from "../transformers/HrmTimeTrackingDepartmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingOwnerDepartments(props: {
  owner: OwnerPayload;
  body: IHrmTimeTrackingDepartment.IRequest;
}): Promise<IPageIHrmTimeTrackingDepartment.ISummary> {
  const session =
    await MyGlobal.prisma.hrm_time_tracking_owner_sessions.findUniqueOrThrow({
      where: {
        id: props.owner.session_id,
      },
      select: {
        id: true,
        hrm_time_tracking_owner_id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  if (session.hrm_time_tracking_owner_id !== props.owner.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (session.hrm_time_tracking_organization_id === null) {
    throw new HttpException("No active organization context selected", 400);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    hrm_time_tracking_organization_id:
      session.hrm_time_tracking_organization_id,
    deleted_at: null,
    ...(props.body.search !== undefined && props.body.search.length !== 0
      ? {
          OR: [
            {
              name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(props.body.name !== undefined
      ? {
          name: props.body.name,
        }
      : {}),
    ...(props.body.description !== undefined
      ? {
          description: {
            contains: props.body.description,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.parentDepartmentId !== undefined
      ? {
          parent_department_id: props.body.parentDepartmentId,
        }
      : {}),
    ...(props.body.isTopLevel === true
      ? {
          parent_department_id: null,
        }
      : {}),
    ...(props.body.isTopLevel === false
      ? {
          NOT: {
            parent_department_id: null,
          },
        }
      : {}),
  } satisfies Prisma.hrm_time_tracking_departmentsWhereInput;
  const orderBy = (
    props.body.sort === "name:desc"
      ? [{ name: "desc" }, { id: "asc" }]
      : props.body.sort === "created_at:asc"
        ? [{ created_at: "asc" }, { id: "asc" }]
        : props.body.sort === "created_at:desc"
          ? [{ created_at: "desc" }, { id: "asc" }]
          : props.body.sort === "updated_at:asc"
            ? [{ updated_at: "asc" }, { id: "asc" }]
            : props.body.sort === "updated_at:desc"
              ? [{ updated_at: "desc" }, { id: "asc" }]
              : [{ name: "asc" }, { id: "asc" }]
  ) satisfies Prisma.hrm_time_tracking_departmentsOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.hrm_time_tracking_departments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...HrmTimeTrackingDepartmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_tracking_departments.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmTimeTrackingDepartmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
