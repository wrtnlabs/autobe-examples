import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
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

export async function getHrmPlatformMemberProjectsProjectIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformProjectSnapshot> {
  // Verify the parent project exists and belongs to the member's organization
  const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
    where: { id: props.projectId },
    select: { id: true, hrm_platform_organization_id: true },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // Query the snapshot with the specific snapshotId and projectId
  const snapshot =
    await MyGlobal.prisma.hrm_platform_project_snapshots.findUnique({
      where: {
        id: props.snapshotId,
        hrm_platform_project_id: props.projectId,
      },
      ...HrmPlatformProjectSnapshotTransformer.select(),
    });
  if (snapshot === null) {
    throw new HttpException("Snapshot not found", 404);
  }
  return await HrmPlatformProjectSnapshotTransformer.transform(snapshot);
}
