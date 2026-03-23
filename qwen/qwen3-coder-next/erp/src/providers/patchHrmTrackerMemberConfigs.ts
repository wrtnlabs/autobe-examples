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

export async function patchHrmTrackerMemberConfigs(props: {
  member: MemberPayload;
  body: IHrmTrackerSystemConfig.IRequest;
}): Promise<IHrmTrackerSystemConfig> {
  const employee = await MyGlobal.prisma.hrm_tracker_employees.findFirstOrThrow(
    {
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
    },
  );
  const keys = Array.isArray(props.body.key)
    ? props.body.key
    : [props.body.key];
  const organizationId = employee.organization_id;
  const now = new Date().toISOString();
  const updatedRecords = await MyGlobal.prisma.$transaction(async (prisma) => {
    const promises = keys.map(async (config) => {
      const existing = await prisma.hrm_tracker_system_configs.findFirst({
        where: {
          hrm_tracker_organization_id: organizationId,
          key: config.key,
          deleted_at: null,
        },
      });
      if (existing) {
        return prisma.hrm_tracker_system_configs.update({
          where: { id: existing.id },
          data: {
            value: config.value,
            updated_at: now,
          },
          ...HrmTrackerSystemConfigTransformer.select(),
        });
      } else {
        return prisma.hrm_tracker_system_configs.create({
          data: {
            id: v4(),
            hrm_tracker_organization_id: organizationId,
            key: config.key,
            value: config.value,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
          ...HrmTrackerSystemConfigTransformer.select(),
        });
      }
    });
    return await Promise.all(promises);
  });
  return await HrmTrackerSystemConfigTransformer.transform(updatedRecords[0]);
}
