import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeSnapshot";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeSnapshotTransformer } from "../transformers/HrmPlatformEmployeeSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberEmployeeSnapshotsSnapshotId(props: {
  member: MemberPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformEmployeeSnapshot> {
  const snapshot =
    await MyGlobal.prisma.hrm_platform_employee_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        deleted_at: null,
      },
      ...HrmPlatformEmployeeSnapshotTransformer.select(),
    });
  return await HrmPlatformEmployeeSnapshotTransformer.transform(snapshot);
}
