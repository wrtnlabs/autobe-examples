import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformEmployeeDepartmentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeDepartmentHistory";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeDepartmentHistoryTransformer } from "../transformers/HrmPlatformEmployeeDepartmentHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberEmployeeDepartmentHistoriesHistoryId(props: {
  member: MemberPayload;
  historyId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformEmployeeDepartmentHistory> {
  const history =
    await MyGlobal.prisma.hrm_platform_employee_department_histories.findUniqueOrThrow(
      {
        where: { id: props.historyId },
        ...HrmPlatformEmployeeDepartmentHistoryTransformer.select(),
      },
    );
  return await HrmPlatformEmployeeDepartmentHistoryTransformer.transform(
    history,
  );
}
