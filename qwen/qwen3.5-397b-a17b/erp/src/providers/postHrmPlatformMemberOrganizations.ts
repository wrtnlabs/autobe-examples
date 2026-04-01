import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformOrganizationCollector } from "../collectors/HrmPlatformOrganizationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformOrganizationTransformer } from "../transformers/HrmPlatformOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberOrganizations(props: {
  member: MemberPayload;
  body: IHrmPlatformOrganization.ICreate;
}): Promise<IHrmPlatformOrganization> {
  const organization = await MyGlobal.prisma.hrm_platform_organizations.create({
    data: await HrmPlatformOrganizationCollector.collect({
      body: props.body,
    }),
    ...HrmPlatformOrganizationTransformer.select(),
  });
  let ownerRole = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      organization_id: organization.id,
      name: "Owner",
      is_builtin: true,
      deleted_at: null,
    },
  });
  if (!ownerRole) {
    ownerRole = await MyGlobal.prisma.hrm_platform_roles.create({
      data: {
        id: v4(),
        organization_id: organization.id,
        name: "Owner",
        description: "Full access to all organization features",
        is_builtin: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  }
  await MyGlobal.prisma.hrm_platform_employees.create({
    data: {
      id: v4(),
      organization_id: organization.id,
      user_id: props.member.id,
      role_id: ownerRole.id,
      department_id: null,
      position: null,
      employment_type: "full-time",
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  return await HrmPlatformOrganizationTransformer.transform(organization);
}
