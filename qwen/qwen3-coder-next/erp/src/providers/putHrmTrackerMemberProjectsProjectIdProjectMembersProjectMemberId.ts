import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerProjectMemberTransformer } from "../transformers/HrmTrackerProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTrackerMemberProjectsProjectIdProjectMembersProjectMemberId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  projectMemberId: string & tags.Format<"uuid">;
  body: IHrmTrackerProjectMember.IUpdate;
}): Promise<IHrmTrackerProjectMember> {
  // Find existing project member
  const existing =
    await MyGlobal.prisma.hrm_tracker_project_members.findUniqueOrThrow({
      where: { id: props.projectMemberId },
      select: { hrm_tracker_project_id: true },
    });
  // Verify project member belongs to specified project
  if (existing.hrm_tracker_project_id !== props.projectId) {
    throw new HttpException(
      "Project member not found in specified project",
      404,
    );
  }
  // Update role and timestamp
  const updated = await MyGlobal.prisma.hrm_tracker_project_members.update({
    where: { id: props.projectMemberId },
    data: {
      ...(props.body.role !== undefined && { role: props.body.role }),
      updated_at: new Date(),
    },
    ...HrmTrackerProjectMemberTransformer.select(),
  });
  return await HrmTrackerProjectMemberTransformer.transform(updated);
}
