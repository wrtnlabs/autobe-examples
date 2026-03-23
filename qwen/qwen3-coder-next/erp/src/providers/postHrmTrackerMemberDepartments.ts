import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTrackerDepartmentCollector } from "../collectors/HrmTrackerDepartmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerDepartmentTransformer } from "../transformers/HrmTrackerDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTrackerMemberDepartments(props: {
  member: MemberPayload;
  body: IHrmTrackerDepartment.ICreate;
}): Promise<IHrmTrackerDepartment> {
  const created = await MyGlobal.prisma.hrm_tracker_departments.create({
    data: await HrmTrackerDepartmentCollector.collect({
      body: props.body,
      session: { id: props.member.id },
    }),
    ...HrmTrackerDepartmentTransformer.select(),
  });
  return await HrmTrackerDepartmentTransformer.transform(created);
}
