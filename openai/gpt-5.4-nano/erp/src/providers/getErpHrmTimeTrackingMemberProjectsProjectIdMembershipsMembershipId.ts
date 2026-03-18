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
import { ErpHrmTimeTrackingProjectMembershipTransformer } from "../transformers/ErpHrmTimeTrackingProjectMembershipTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingMemberProjectsProjectIdMembershipsMembershipId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingProjectMembership> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.findUniqueOrThrow(
      {
        where: { id: props.membershipId },
        ...ErpHrmTimeTrackingProjectMembershipTransformer.select(),
      },
    );
  if (membership.project_id !== props.projectId) {
    throw new HttpException("Not Found", 404);
  }
  // active-only visibility
  if (membership.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // employee-perspective: only the caller's own employee membership is visible
  if (membership.employee_id !== props.member.id) {
    throw new HttpException("Not Found", 404);
  }
  return await ErpHrmTimeTrackingProjectMembershipTransformer.transform(
    membership,
  );
}
