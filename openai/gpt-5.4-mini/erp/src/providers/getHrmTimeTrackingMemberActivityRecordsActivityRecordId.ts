import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingActivityRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityRecord";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingActivityRecordTransformer } from "../transformers/HrmTimeTrackingActivityRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingMemberActivityRecordsActivityRecordId(props: {
  member: MemberPayload;
  activityRecordId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingActivityRecord> {
  const activityRecord =
    await MyGlobal.prisma.hrm_time_tracking_activity_records.findUniqueOrThrow({
      where: {
        id: props.activityRecordId,
      },
      ...HrmTimeTrackingActivityRecordTransformer.select(),
    });
  return await HrmTimeTrackingActivityRecordTransformer.transform(
    activityRecord,
  );
}
