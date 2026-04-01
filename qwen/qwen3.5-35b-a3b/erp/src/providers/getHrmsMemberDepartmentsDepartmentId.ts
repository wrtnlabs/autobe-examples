import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsDepartmentTransformer } from "../transformers/HrmsDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmsMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<IHrmsDepartment> {
  const memberOrganization =
    await MyGlobal.prisma.hrms_organization_members.findFirstOrThrow({
      where: {
        member: { id: props.member.id },
        deleted_at: null,
      },
    });
  const department = await MyGlobal.prisma.hrms_departments.findFirstOrThrow({
    where: {
      id: props.departmentId,
      organization_id: memberOrganization.hrms_organization_id,
      deleted_at: null,
    },
    ...HrmsDepartmentTransformer.select(),
  });
  return await HrmsDepartmentTransformer.transform(department);
}
