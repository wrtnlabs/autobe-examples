import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformRoleCollector } from "../collectors/HrmPlatformRoleCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformRoleTransformer } from "../transformers/HrmPlatformRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAdminRoles(props: {
  admin: AdminPayload;
  body: IHrmPlatformRole.ICreate;
}): Promise<IHrmPlatformRole> {
  const collectorData = await HrmPlatformRoleCollector.collect({
    body: props.body,
    hrmPlatformAdmins: { id: props.admin.id },
    hrmPlatformAdminSessions: { id: props.admin.session_id },
  });
  const created = await MyGlobal.prisma.hrm_platform_roles.create({
    data: collectorData as Prisma.hrm_platform_rolesCreateInput,
    ...HrmPlatformRoleTransformer.select(),
  });
  return await HrmPlatformRoleTransformer.transform(created);
}
