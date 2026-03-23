import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerSystemConfig";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerSystemConfigTransformer } from "../transformers/HrmTrackerSystemConfigTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTrackerMemberConfigsConfigKey(props: {
  member: MemberPayload;
  configKey: string;
}): Promise<IHrmTrackerSystemConfig> {
  const employee = await MyGlobal.prisma.hrm_tracker_employees.findFirstOrThrow(
    {
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: { organization_id: true },
    },
  );
  const record =
    await MyGlobal.prisma.hrm_tracker_system_configs.findFirstOrThrow({
      where: {
        hrm_tracker_organization_id: employee.organization_id,
        key: props.configKey,
        deleted_at: null,
      },
      ...HrmTrackerSystemConfigTransformer.select(),
    });
  return await HrmTrackerSystemConfigTransformer.transform(record);
}
