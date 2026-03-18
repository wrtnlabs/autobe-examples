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

export async function getErpHrmMemberProjectsProjectIdMembersProjectMemberId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  projectMemberId: string & tags.Format<"uuid">;
}): Promise<IErpHrmProjectMember> {
  // Access control: Verify requesting user is a member of the specified project
  const requestingMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        project_id: props.projectId,
        organizationMember: {
          user_id: props.member.id,
        },
        deleted_at: null,
      },
      select: { id: true },
    });
  if (requestingMembership === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Query the target project member
  const projectMember =
    await MyGlobal.prisma.erp_hrm_project_members.findUniqueOrThrow({
      where: {
        id: props.projectMemberId,
        project_id: props.projectId,
        deleted_at: null,
      },
      ...ErpHrmProjectMemberTransformer.select(),
    });
  return await ErpHrmProjectMemberTransformer.transform(projectMember);
}
