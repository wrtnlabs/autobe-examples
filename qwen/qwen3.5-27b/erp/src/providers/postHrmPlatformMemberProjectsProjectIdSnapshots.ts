import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformProjectSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectSnapshotTransformer } from "../transformers/HrmPlatformProjectSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberProjectsProjectIdSnapshots(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformProjectSnapshot> {
  // Find the project and verify it exists and belongs to the member's organization
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        name: true,
        description: true,
        status: true,
        color_code: true,
        budget_hours: true,
      },
    },
  );
  // Verify the member has access to this organization via their session
  const memberSession =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUnique({
      where: {
        id: props.member.session_id,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    });
  if (
    memberSession === null ||
    memberSession.hrm_platform_organization_id !== project.organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Create the snapshot with denormalized project fields
  const snapshot = await MyGlobal.prisma.hrm_platform_project_snapshots.create({
    data: {
      id: v4(),
      code: v4(),
      project_id: project.id,
      hrm_platform_organization_id: project.organization_id,
      created_by_id: props.member.id,
      name: project.name,
      description: project.description,
      status: project.status,
      color_code: project.color_code,
      budget_hours: project.budget_hours,
      created_at: new Date(),
    },
    ...HrmPlatformProjectSnapshotTransformer.select(),
  });
  // Transform and return the snapshot
  return await HrmPlatformProjectSnapshotTransformer.transform(snapshot);
}
