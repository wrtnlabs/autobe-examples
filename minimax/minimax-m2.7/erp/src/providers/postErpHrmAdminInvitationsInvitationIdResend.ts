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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmInvitationTransformer } from "../transformers/ErpHrmInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminInvitationsInvitationIdResend(props: {
  admin: AdminPayload;
  invitationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmInvitation> {
  const invitation = await MyGlobal.prisma.erp_hrm_invitations.findFirst({
    where: {
      id: props.invitationId,
      deleted_at: null,
    },
    select: {
      erp_hrm_organization_id: true,
      ...ErpHrmInvitationTransformer.select().select,
    },
  });
  if (!invitation) {
    throw new HttpException("Invitation not found", 404);
  }
  if (invitation.status !== "pending") {
    if (invitation.status === "accepted") {
      throw new HttpException("Cannot resend accepted invitation", 400);
    }
    throw new HttpException("Cannot resend expired invitation", 400);
  }
  const organization = await MyGlobal.prisma.erp_hrm_organizations.findFirst({
    where: {
      id: invitation.erp_hrm_organization_id,
    },
    select: {
      id: true,
    },
  });
  if (!organization) {
    throw new HttpException(
      "Invitation not found in current organization",
      403,
    );
  }
  const newToken = v4();
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const result = await tx.erp_hrm_invitations.update({
      where: { id: props.invitationId },
      data: {
        token: newToken,
        expires_at: newExpiresAt,
        updated_at: new Date(),
      },
      ...ErpHrmInvitationTransformer.select(),
    });
    return result;
  });
  return ErpHrmInvitationTransformer.transform(updated);
}
