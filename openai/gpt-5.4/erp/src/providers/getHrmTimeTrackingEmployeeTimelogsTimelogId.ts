import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { HrmTimeTrackingTimelogTransformer } from "../transformers/HrmTimeTrackingTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingEmployeeTimelogsTimelogId(props: {
  employee: EmployeePayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingTimelog> {
  const timelog =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.findFirstOrThrow({
      where: {
        id: props.timelogId,
        hrm_time_tracking_employee_id: props.employee.id,
        deleted_at: null,
      },
      ...HrmTimeTrackingTimelogTransformer.select(),
    });
  return await HrmTimeTrackingTimelogTransformer.transform(timelog);
}
