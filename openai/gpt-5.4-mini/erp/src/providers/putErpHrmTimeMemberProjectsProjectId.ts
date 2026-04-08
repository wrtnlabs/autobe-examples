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

export async function putErpHrmTimeMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTimeProject.IUpdate;
}): Promise<IErpHrmTimeProject> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
        },
        select: {
          erp_hrm_time_organization_id: true,
        },
      },
    );
  await MyGlobal.prisma.erp_hrm_time_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const updated = await MyGlobal.prisma.erp_hrm_time_projects.update({
    where: {
      id: props.projectId,
    },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.color_code !== undefined && {
        color_code: props.body.color_code,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.budget_hours !== undefined && {
        budget_hours: props.body.budget_hours,
      }),
      ...(props.body.start_date !== undefined && {
        start_date: props.body.start_date,
      }),
      ...(props.body.end_date !== undefined && {
        end_date: props.body.end_date,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
    ...ErpHrmTimeProjectTransformer.select(),
  });
  return await ErpHrmTimeProjectTransformer.transform(updated);
}
