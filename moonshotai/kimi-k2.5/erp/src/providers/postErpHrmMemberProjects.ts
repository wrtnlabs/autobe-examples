import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmProjectCollector } from "../collectors/ErpHrmProjectCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectTransformer } from "../transformers/ErpHrmProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberProjects(props: {
  member: MemberPayload;
  body: IErpHrmProject.ICreate;
}): Promise<IErpHrmProject> {
  const organizationMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        user_id: props.member.id,
      },
      select: {
        organization_id: true,
      },
    });
  const created = await MyGlobal.prisma.erp_hrm_projects.create({
    data: await ErpHrmProjectCollector.collect({
      body: props.body,
      erpHrmOrganizations: { id: organizationMember.organization_id },
    }),
    ...ErpHrmProjectTransformer.select(),
  });
  return await ErpHrmProjectTransformer.transform(created);
}
