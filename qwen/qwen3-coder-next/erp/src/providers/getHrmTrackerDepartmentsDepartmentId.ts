import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTrackerDepartmentTransformer } from "../transformers/HrmTrackerDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTrackerDepartmentsDepartmentId(props: {
  departmentId: string;
}): Promise<IHrmTrackerDepartment> {
  const department =
    await MyGlobal.prisma.hrm_tracker_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      ...HrmTrackerDepartmentTransformer.select(),
    });
  return await HrmTrackerDepartmentTransformer.transform(department);
}
