import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTrackerRoleCollector } from "../collectors/HrmTrackerRoleCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerRoleTransformer } from "../transformers/HrmTrackerRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTrackerMemberRoles(props: {
  member: MemberPayload;
  body: IHrmTrackerRole.ICreate;
}): Promise<IHrmTrackerRole> {
  const organization =
    await MyGlobal.prisma.hrm_tracker_organizations.findFirstOrThrow({
      where: {
        employees: {
          some: {
            user_id: props.member.id,
            deleted_at: null,
          },
        },
        deleted_at: null,
      },
      select: { id: true },
    });
  const builtInRoleNames = ["Owner", "Manager", "Employee"];
  if (builtInRoleNames.includes(props.body.name)) {
    throw new HttpException("Built-in role names cannot be used", 400);
  }
  const existingRole = await MyGlobal.prisma.hrm_tracker_roles.findFirst({
    where: {
      hrm_tracker_organization_id: organization.id,
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existingRole) {
    throw new HttpException(
      "Role name must be unique within organization",
      400,
    );
  }
  const created = await MyGlobal.prisma.hrm_tracker_roles.create({
    data: await HrmTrackerRoleCollector.collect({
      body: props.body,
      hrmTrackerOrganizations: { id: organization.id },
    }),
    ...HrmTrackerRoleTransformer.select(),
  });
  return await HrmTrackerRoleTransformer.transform(created);
}
