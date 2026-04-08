import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationMembership";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeOrganizationMembershipTransformer } from "../transformers/ErpHrmTimeOrganizationMembershipTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberOrganizationMembershipsOrganizationMembershipId(props: {
  member: MemberPayload;
  organizationMembershipId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeOrganizationMembership> {
  const selectedMembership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          id: props.organizationMembershipId,
          erp_hrm_time_member_id: props.member.id,
          is_selected_context: true,
          deleted_at: null,
        },
        ...ErpHrmTimeOrganizationMembershipTransformer.select(),
      },
    );
  return await ErpHrmTimeOrganizationMembershipTransformer.transform(
    selectedMembership,
  );
}
