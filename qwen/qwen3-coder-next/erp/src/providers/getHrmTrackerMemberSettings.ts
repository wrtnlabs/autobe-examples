import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganizationSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerOrganizationSettingTransformer } from "../transformers/HrmTrackerOrganizationSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTrackerMemberSettings(props: {
  member: MemberPayload;
}): Promise<IHrmTrackerOrganizationSetting> {
  const employee = await MyGlobal.prisma.hrm_tracker_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      organization_id: true,
    },
  });
  if (employee === null || employee.organization_id === null) {
    throw new HttpException("Employee not found in organization", 404);
  }
  const settings =
    await MyGlobal.prisma.hrm_tracker_organization_settings.findFirst({
      where: { id: employee.organization_id },
      ...HrmTrackerOrganizationSettingTransformer.select(),
    });
  if (settings === null) {
    throw new HttpException("Organization settings not found", 404);
  }
  return await HrmTrackerOrganizationSettingTransformer.transform(settings);
}
