import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingMemberAtSummaryTransformer } from "../transformers/ErpHrmTimeTrackingMemberAtSummaryTransformer";
import { ErpHrmTimeTrackingProjectAtSummaryTransformer } from "../transformers/ErpHrmTimeTrackingProjectAtSummaryTransformer";
import { ErpHrmTimeTrackingProjectMembershipTransformer } from "../transformers/ErpHrmTimeTrackingProjectMembershipTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeTrackingMemberProjectsProjectIdMembershipsMembershipId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingProjectMembership.IUpdate;
}): Promise<IErpHrmTimeTrackingProjectMembership> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const membership =
      await tx.erp_hrm_time_tracking_project_memberships.findUniqueOrThrow({
        where: { id: props.membershipId },
        select: {
          id: true,
          project_id: true,
          employee_id: true,
          membership_role: true,
          deleted_at: true,
          created_at: true,
          updated_at: true,
          project: ErpHrmTimeTrackingProjectAtSummaryTransformer.select(),
          employee: ErpHrmTimeTrackingMemberAtSummaryTransformer.select(),
        },
      });
    if (membership.project_id !== props.projectId) {
      throw new HttpException("Invalid project scope", 400);
    }
    if (membership.deleted_at !== null) {
      throw new HttpException("Membership is deleted", 400);
    }
    if (membership.project.deleted_at !== null) {
      throw new HttpException("Project is deleted", 400);
    }
    if (props.body.membership_role !== undefined) {
      if (props.body.membership_role.length < 1) {
        throw new HttpException("Invalid membership role", 400);
      }
    }
    const updated = await tx.erp_hrm_time_tracking_project_memberships.update({
      where: { id: props.membershipId },
      data: {
        ...(props.body.membership_role !== undefined && {
          membership_role: props.body.membership_role,
        }),
      },
      select: ErpHrmTimeTrackingProjectMembershipTransformer.select().select,
    });
    return await ErpHrmTimeTrackingProjectMembershipTransformer.transform(
      updated,
    );
  });
}
