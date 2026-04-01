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
    await MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.findFirstOrThrow(
      {
        where: {
          id: props.membershipId,
          project_id: props.projectId,
          deleted_at: null,
          employee_id: props.member.id,
        },
        ...ErpHrmTimeTrackingProjectMembershipTransformer.select(),
      },
    );
  await MyGlobal.prisma.erp_hrm_time_tracking_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true },
  });
  return await ErpHrmTimeTrackingProjectMembershipTransformer.transform(
    membership,
  );
}
