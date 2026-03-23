import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTrackerRoleAtSummaryTransformer } from "../transformers/HrmTrackerRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchHrmTrackerRoles(props: {
  body: IHrmTrackerRole.IRequest;
}): Promise<IPageIHrmTrackerRole.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where condition based on request filters
  const where: Prisma.hrm_tracker_rolesWhereInput = {
    deleted_at: null,
  };
  if (props.body.name !== undefined) {
    where.name = props.body.name;
  }
  if (props.body.is_custom !== undefined) {
    where.is_custom = props.body.is_custom;
  }
  if (props.body.is_default !== undefined) {
    where.is_default = props.body.is_default;
  }
  if (props.body.search !== undefined) {
    where.OR = [
      { name: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  const data = await MyGlobal.prisma.hrm_tracker_roles.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...HrmTrackerRoleAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_tracker_roles.count({ where });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmTrackerRoleAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
