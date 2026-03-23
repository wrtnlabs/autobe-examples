import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogChange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformActivityLogChangeTransformer } from "../transformers/HrmPlatformActivityLogChangeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberActivityLogsActivityLogIdChangesChangeId(props: {
  member: MemberPayload;
  activityLogId: string & tags.Format<"uuid">;
  changeId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformActivityLogChange> {
  const change =
    await MyGlobal.prisma.hrm_platform_activity_log_changes.findUniqueOrThrow({
      where: {
        id: props.changeId,
        hrm_platform_activity_log_id: props.activityLogId,
      },
      ...HrmPlatformActivityLogChangeTransformer.select(),
    });
  const activityLog =
    await MyGlobal.prisma.hrm_platform_activity_logs.findUnique({
      where: {
        id: props.activityLogId,
      },
      select: {
        organization: {
          select: {
            id: true,
          },
        },
      },
    });
  if (activityLog === null) {
    throw new HttpException("Activity log not found", 404);
  }
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      organization_id: activityLog.organization.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmPlatformActivityLogChangeTransformer.transform(change);
}
