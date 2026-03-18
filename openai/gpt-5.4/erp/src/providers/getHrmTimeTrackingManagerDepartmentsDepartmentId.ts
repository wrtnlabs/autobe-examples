import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";
import { HrmTimeTrackingDepartmentTransformer } from "../transformers/HrmTimeTrackingDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingManagerDepartmentsDepartmentId(props: {
  manager: ManagerPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingDepartment> {
  await MyGlobal.prisma.hrm_time_tracking_manager_sessions.findUniqueOrThrow({
    where: {
      id: props.manager.session_id,
    },
    select: {
      id: true,
    },
  });
  const department =
    await MyGlobal.prisma.hrm_time_tracking_departments.findFirstOrThrow({
      where: {
        id: props.departmentId,
        deleted_at: null,
      },
      ...HrmTimeTrackingDepartmentTransformer.select(),
    });
  return await HrmTimeTrackingDepartmentTransformer.transform(department);
}
