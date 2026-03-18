import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // Step 1: Resolve the active organization member record for this member
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        status: "active",
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  // Step 2: Check that the member's role has the `project:manage` permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      role_id: orgMember.role_id,
      permission_code: "project:manage",
    },
    select: { id: true },
  });
  if (permission === null) {
    throw new HttpException(
      "Forbidden: project:manage permission required",
      403,
    );
  }
  // Step 3: Create the project using the Collector (write side)
  const created = await MyGlobal.prisma.erp_hrm_projects.create({
    data: await ErpHrmProjectCollector.collect({
      body: props.body,
      erpHrmOrganizationMembers: { id: orgMember.id },
      erpHrmMemberSessions: { id: props.member.session_id },
    }),
    ...ErpHrmProjectTransformer.select(),
  });
  // Step 4: Transform and return the full project record
  return ErpHrmProjectTransformer.transform(created);
}
