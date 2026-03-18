import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectMemberTransformer } from "../transformers/HrmPlatformProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberProjectsProjectIdMembersMembershipId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
  body: IHrmPlatformProjectMember.IUpdate;
}): Promise<IHrmPlatformProjectMember> {
  // Validate membership exists, belongs to project, and is not deleted
  const membership =
    await MyGlobal.prisma.hrm_platform_project_members.findUniqueOrThrow({
      where: {
        id: props.membershipId,
        hrm_platform_project_id: props.projectId,
        deleted_at: null,
      },
    });
  // Update the membership with new role if provided
  await MyGlobal.prisma.hrm_platform_project_members.update({
    where: { id: props.membershipId },
    data: {
      ...(props.body.role !== undefined && { role: props.body.role }),
      updated_at: new Date(),
    },
  });
  // Fetch updated record with relations
  const updated =
    await MyGlobal.prisma.hrm_platform_project_members.findUniqueOrThrow({
      where: { id: props.membershipId },
      ...HrmPlatformProjectMemberTransformer.select(),
    });
  return await HrmPlatformProjectMemberTransformer.transform(updated);
}
