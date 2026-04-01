import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeProjectCollector } from "../collectors/ErpHrmTimeProjectCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeProjectTransformer } from "../transformers/ErpHrmTimeProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberProjects(props: {
  member: MemberPayload;
  body: IErpHrmTimeProject.ICreate;
}): Promise<IErpHrmTimeProject> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          is_selected_context: true,
          deleted_at: null,
        },
        select: {
          erp_hrm_time_organization_id: true,
        },
      },
    );
  const created = await MyGlobal.prisma.erp_hrm_time_projects.create({
    data: await ErpHrmTimeProjectCollector.collect({
      body: props.body,
      organization: {
        id: membership.erp_hrm_time_organization_id,
      },
    }),
    ...ErpHrmTimeProjectTransformer.select(),
  });
  return await ErpHrmTimeProjectTransformer.transform(created);
}
