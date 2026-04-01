import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsDepartmentAtSummaryTransformer } from "../transformers/HrmsDepartmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberOrganizationsOrganizationIdDepartments(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmsDepartment.IRequest;
}): Promise<IPageIHrmsDepartment.ISummary> {
  const page = props.body.page ? parseInt(props.body.page) : 0;
  const limit = props.body.limit ?? 100;
  const search = props.body.search;
  const parentId = props.body.parent_id;
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const includeDeleted = props.body.include_deleted ?? false;
  await MyGlobal.prisma.hrms_organizations.findUniqueOrThrow({
    where: { id: props.organizationId, deleted_at: null },
  });
  if (parentId !== undefined && parentId !== null) {
    const existingParent = await MyGlobal.prisma.hrms_departments.findFirst({
      where: {
        id: parentId,
        organization_id: props.organizationId,
        deleted_at: includeDeleted ? undefined : null,
      },
    });
    if (existingParent === undefined) {
      throw new HttpException("Invalid parent department", 400);
    }
  }
  const whereInput: Prisma.hrms_departmentsWhereInput = {
    organization_id: props.organizationId,
    deleted_at: includeDeleted ? undefined : null,
    ...(search !== undefined && {
      name: { contains: search, mode: "insensitive" },
    }),
    ...(parentId !== undefined && { parent_id: parentId }),
  } satisfies Prisma.hrms_departmentsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.hrms_departments.findMany({
      where: whereInput,
      orderBy: { [sortBy]: sortOrder },
      take: limit + 1,
      ...HrmsDepartmentAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrms_departments.count({
      where: whereInput,
    }),
  ]);
  const hasMore = data.length > limit;
  const resultData = hasMore ? data.slice(0, -1) : data;
  return {
    pagination: {
      current: page + 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(resultData, (elem) =>
      HrmsDepartmentAtSummaryTransformer.transform(elem),
    ),
  } satisfies IPageIHrmsDepartment.ISummary;
}
