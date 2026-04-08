import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeProjectTransformer } from "../transformers/ErpHrmTimeProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberProjectsProjectIdComplete(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeProject> {
  const scopedProject =
    await MyGlobal.prisma.erp_hrm_time_projects.findFirstOrThrow({
      where: {
        id: props.projectId,
        erp_hrm_time_organization_id: (
          props.member as unknown as {
            organization_id: string;
          }
        ).organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
        status: true,
      },
    });
  if (props.member.type !== "member") {
    throw new HttpException("Forbidden", 403);
  }
  const permissions = (
    props.member as unknown as {
      permissions?: {
        project_management?: boolean;
      };
    }
  ).permissions;
  if (permissions?.project_management !== true) {
    throw new HttpException("Forbidden", 403);
  }
  if (scopedProject.status === "completed") {
    throw new HttpException("Project is already completed", 400);
  }
  await MyGlobal.prisma.erp_hrm_time_projects.update({
    where: { id: scopedProject.id },
    data: {
      status: "completed",
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updated = await MyGlobal.prisma.erp_hrm_time_projects.findUniqueOrThrow(
    {
      where: { id: scopedProject.id },
      ...ErpHrmTimeProjectTransformer.select(),
    },
  );
  return await ErpHrmTimeProjectTransformer.transform(updated);
}
