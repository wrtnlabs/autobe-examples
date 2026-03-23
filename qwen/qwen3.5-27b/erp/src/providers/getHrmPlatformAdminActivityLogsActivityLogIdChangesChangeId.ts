import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogChange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformActivityLogChangeTransformer } from "../transformers/HrmPlatformActivityLogChangeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformAdminActivityLogsActivityLogIdChangesChangeId(props: {
  admin: AdminPayload;
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
  return await HrmPlatformActivityLogChangeTransformer.transform(change);
}
