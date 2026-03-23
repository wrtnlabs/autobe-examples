import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerSystemConfig";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTrackerSystemConfigCollector } from "../collectors/HrmTrackerSystemConfigCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerSystemConfigTransformer } from "../transformers/HrmTrackerSystemConfigTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTrackerMemberConfigs(props: {
  member: MemberPayload;
  body: IHrmTrackerSystemConfig.ICreate;
}): Promise<IHrmTrackerSystemConfig> {
  // Get member session
  const memberSession =
    await MyGlobal.prisma.hrm_tracker_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { member_id: true, id: true },
    });
  // Join to employees to get organization_id through member
  const employee = await MyGlobal.prisma.hrm_tracker_employees.findFirstOrThrow(
    {
      where: {
        user_id: memberSession.member_id,
        deleted_at: null,
      },
      select: { organization_id: true },
    },
  );
  // Check for duplicate key within the same organization
  const existing = await MyGlobal.prisma.hrm_tracker_system_configs.findFirst({
    where: {
      organization: { id: employee.organization_id },
      key: props.body.key,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Configuration key already exists", 409);
  }
  const created = await MyGlobal.prisma.hrm_tracker_system_configs.create({
    data: await HrmTrackerSystemConfigCollector.collect({
      body: props.body,
      hrmTrackerOrganizations: {
        id: employee.organization_id,
      },
    }),
    ...HrmTrackerSystemConfigTransformer.select(),
  });
  return await HrmTrackerSystemConfigTransformer.transform(created);
}
