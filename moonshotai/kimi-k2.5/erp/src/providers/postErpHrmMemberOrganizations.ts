import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmOrganizationCollector } from "../collectors/ErpHrmOrganizationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmOrganizationTransformer } from "../transformers/ErpHrmOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberOrganizations(props: {
  member: MemberPayload;
  body: IErpHrmOrganization.ICreate;
}): Promise<IErpHrmOrganization> {
  // Check for duplicate organization name (unique constraint)
  const existing = await MyGlobal.prisma.erp_hrm_organizations.findFirst({
    where: { name: props.body.name },
  });
  if (existing !== null) {
    throw new HttpException("Organization with this name already exists", 409);
  }
  // Collect data using the collector
  const createInput = await ErpHrmOrganizationCollector.collect({
    body: props.body,
    erpHrmMembers: { id: props.member.id },
    erpHrmMemberSessions: { id: props.member.session_id },
  });
  // Create the organization with transformer select
  const created = await MyGlobal.prisma.erp_hrm_organizations.create({
    data: createInput,
    ...ErpHrmOrganizationTransformer.select(),
  });
  // Transform and return
  return await ErpHrmOrganizationTransformer.transform(created);
}
