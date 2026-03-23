import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerActivityLog";
import { IHrmTrackerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerGuest";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTrackerActivityLogTransformer } from "../transformers/HrmTrackerActivityLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTrackerActivityLogsActivityLogId(props: {
  activityLogId: string;
}): Promise<IHrmTrackerActivityLog> {
  const log = await MyGlobal.prisma.hrm_tracker_activity_logs.findUniqueOrThrow(
    {
      where: { id: props.activityLogId },
      ...HrmTrackerActivityLogTransformer.select(),
    },
  );
  return await HrmTrackerActivityLogTransformer.transform(log);
}
