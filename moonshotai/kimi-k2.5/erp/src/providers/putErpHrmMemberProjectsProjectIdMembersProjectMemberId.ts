import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectMemberTransformer } from "../transformers/ErpHrmProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberProjectsProjectIdMembersProjectMemberId(props: {
  member: MemberPayload;
  projectId: string;
  projectMemberId: string;
  body: IErpHrmProjectMember.IUpdate;
}): Promise<IErpHrmProjectMember> {
  // Verify the project member exists and belongs to the specified project
  const existingMember =
    await MyGlobal.prisma.erp_hrm_project_members.findUnique({
      where: {
        id: props.projectMemberId,
        deleted_at: null,
      },
      select: {
        id: true,
        project_id: true,
      },
    });
  if (existingMember === null) {
    throw new HttpException("Project member not found", 404);
  }
  if (existingMember.project_id !== props.projectId) {
    throw new HttpException(
      "Project member does not belong to specified project",
      404,
    );
  }
  // Update the project member role and timestamp
  await MyGlobal.prisma.erp_hrm_project_members.update({
    where: {
      id: props.projectMemberId,
    },
    data: {
      ...(props.body.role !== undefined && { role: props.body.role }),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Retrieve the updated record with full relations
  const updated =
    await MyGlobal.prisma.erp_hrm_project_members.findUniqueOrThrow({
      where: {
        id: props.projectMemberId,
      },
      ...ErpHrmProjectMemberTransformer.select(),
    });
  return await ErpHrmProjectMemberTransformer.transform(updated);
}
