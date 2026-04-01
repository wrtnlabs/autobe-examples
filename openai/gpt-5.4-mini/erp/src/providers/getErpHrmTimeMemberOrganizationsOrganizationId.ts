import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeOrganizationTransformer } from "../transformers/ErpHrmTimeOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeOrganization> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        erp_hrm_time_organization_id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await ErpHrmTimeOrganizationTransformer.transform(
    await MyGlobal.prisma.erp_hrm_time_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
      },
      ...ErpHrmTimeOrganizationTransformer.select(),
    }),
  );
}
