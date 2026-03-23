import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTrackerDepartments(props: {
  body: IHrmTrackerDepartment.IRequest;
}): Promise<IPageIHrmTrackerDepartment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.hrm_tracker_departmentsWhereInput = {
    deleted_at: null,
    ...(props.body.name && { name: { contains: props.body.name } }),
    ...(props.body.parent_id && { parent_id: props.body.parent_id }),
  } satisfies Prisma.hrm_tracker_departmentsWhereInput;
  const data = await MyGlobal.prisma.hrm_tracker_departments.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      parent: {
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.hrm_tracker_departments.count({ where });
  const mappedData: IHrmTrackerDepartment.ISummary[] = data.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    name: item.name,
    description: item.description,
    created_at: item.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: item.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: item.deleted_at?.toISOString() as string &
      tags.Format<"date-time">,
    parent: item.parent
      ? {
          id: item.parent.id as string & tags.Format<"uuid">,
          name: item.parent.name,
          description: item.parent.description,
          created_at: item.parent.created_at.toISOString() as string &
            tags.Format<"date-time">,
          updated_at: item.parent.updated_at.toISOString() as string &
            tags.Format<"date-time">,
          deleted_at: item.parent.deleted_at?.toISOString() as string &
            tags.Format<"date-time">,
        }
      : null,
  }));
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    data: mappedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmTrackerDepartment.ISummary;
}
