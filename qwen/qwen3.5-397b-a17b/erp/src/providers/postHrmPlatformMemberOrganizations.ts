import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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
    }),
    ...HrmPlatformOrganizationTransformer.select(),
  });
  return await HrmPlatformOrganizationTransformer.transform(created);
}
