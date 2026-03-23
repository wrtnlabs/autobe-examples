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

export async function getHrmPlatformMemberProjectsProjectIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformProjectSnapshot> {
  const snapshot =
    await MyGlobal.prisma.hrm_platform_project_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...HrmPlatformProjectSnapshotTransformer.select(),
    });
  if (snapshot.project.id !== props.projectId) {
    throw new HttpException("Not Found", 404);
  }
  return await HrmPlatformProjectSnapshotTransformer.transform(snapshot);
}
