import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentSnapshotTransformer } from "../transformers/HrmPlatformDepartmentSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberDepartmentSnapshotsSnapshotId(props: {
  member: MemberPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformDepartmentSnapshot> {
  const snapshot =
    await MyGlobal.prisma.hrm_platform_department_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        deleted_at: null,
      },
      ...HrmPlatformDepartmentSnapshotTransformer.select(),
    });
  return await HrmPlatformDepartmentSnapshotTransformer.transform(snapshot);
}
