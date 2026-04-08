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
  const created = await MyGlobal.prisma.hrm_platform_organizations.create({
    data: await HrmPlatformOrganizationCollector.collect({
      body: props.body,
      hrmPlatformMembers: { id: props.member.id },
      hrmPlatformMemberSessions: { id: props.member.session_id },
    }),
    ...HrmPlatformOrganizationTransformer.select(),
  });
  await MyGlobal.prisma.hrm_platform_organization_memberships.create({
    data: {
      id: v4(),
      hrm_platform_member_id: props.member.id,
      hrm_platform_organization_id: created.id,
      is_owner: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  return await HrmPlatformOrganizationTransformer.transform(created);
}
