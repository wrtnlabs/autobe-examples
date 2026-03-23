import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerEmployeeRoleChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployeeRoleChange";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTrackerEmployeeRoleChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerEmployeeRoleChange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTrackerEmployeeRoleChangeAtSummaryTransformer } from "../transformers/HrmTrackerEmployeeRoleChangeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTrackerEmployeesEmployeeIdRoleChanges(props: {
  employeeId: string;
}): Promise<IPageIHrmTrackerEmployeeRoleChange.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.hrm_tracker_employee_role_changes.findMany(
    {
      where: {
        hrm_tracker_employee_id: props.employeeId,
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: { changed_at: "desc" },
      ...HrmTrackerEmployeeRoleChangeAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.hrm_tracker_employee_role_changes.count({
    where: {
      hrm_tracker_employee_id: props.employeeId,
      deleted_at: null,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmTrackerEmployeeRoleChangeAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
