import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmInvitationTransformer } from "../transformers/ErpHrmInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberInvitationsInvitationId(props: {
  member: MemberPayload;
  invitationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmInvitation> {
  // Get the member ID from the session
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_member_id: true },
    });
  // Get the employee's organization from the member
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: { erp_hrm_member_id: session.erp_hrm_member_id },
    select: { erp_hrm_organization_id: true },
  });
  // Retrieve the invitation by ID, ensuring it belongs to the current organization and is not deleted
  const invitation = await MyGlobal.prisma.erp_hrm_invitations.findFirstOrThrow(
    {
      where: {
        id: props.invitationId,
        erp_hrm_organization_id: employee.erp_hrm_organization_id,
        deleted_at: null,
      },
      ...ErpHrmInvitationTransformer.select(),
    },
  );
  return await ErpHrmInvitationTransformer.transform(invitation);
}
