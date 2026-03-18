import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitationsInvitationId(props: {
  owner: OwnerPayload;
  organizationId: string & tags.Format<"uuid">;
  invitationId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const invitation =
    await MyGlobal.prisma.hrm_time_tracking_organization_invitations.findUniqueOrThrow(
      {
        where: {
          id: props.invitationId,
        },
        select: {
          id: true,
          hrm_time_tracking_organization_id: true,
          deleted_at: true,
        },
      },
    );
  if (invitation.hrm_time_tracking_organization_id !== props.organizationId) {
    throw new HttpException("Not Found", 404);
  }
  if (invitation.deleted_at !== null) {
    return;
  }
  const now = new Date();
  await MyGlobal.prisma.hrm_time_tracking_organization_invitations.update({
    where: {
      id: props.invitationId,
    },
    data: {
      updated_at: now,
      deleted_at: now,
    },
  });
}
