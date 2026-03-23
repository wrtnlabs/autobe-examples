import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerEmployeeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployeeHistory";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTrackerEmployeeHistoryTransformer } from "../transformers/HrmTrackerEmployeeHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTrackerEmployeesEmployeeIdHistories(props: {
  employeeId: string;
}): Promise<IHrmTrackerEmployeeHistory[]> {
  const histories =
    await MyGlobal.prisma.hrm_tracker_employee_histories.findMany({
      where: { employee_id: props.employeeId },
      orderBy: { created_at: "desc" },
      ...HrmTrackerEmployeeHistoryTransformer.select(),
    });
  return await ArrayUtil.asyncMap(
    histories,
    HrmTrackerEmployeeHistoryTransformer.transform,
  );
}
