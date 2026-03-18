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
import { ManagerPayload } from "../decorators/payload/ManagerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingManagerDepartments(props: {
  manager: ManagerPayload;
  body: IHrmTimeTrackingDepartment.IRequest;
}): Promise<IPageIHrmTimeTrackingDepartment.ISummary> {
  await MyGlobal.prisma.hrm_time_tracking_manager_sessions.findFirstOrThrow({
    where: {
      id: props.manager.session_id,
      hrm_time_tracking_manager_id: props.manager.id,
      expired_at: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
    },
  });
  throw new HttpException("No organization context selected", 400);
}
