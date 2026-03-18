import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingOrganizationInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationInvitation";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingOrganizationInvitationTransformer } from "../transformers/HrmTimeTrackingOrganizationInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitationsInvitationId(props: {
  owner: OwnerPayload;
  organizationId: string & tags.Format<"uuid">;
  invitationId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingOrganizationInvitation> {
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findFirst({
      where: {
        id: props.organizationId,
      },
      select: {
        id: true,
      },
    });
  if (organization === null) {
    throw new HttpException("Forbidden", 403);
  }
  const invitation =
    await MyGlobal.prisma.hrm_time_tracking_organization_invitations.findFirstOrThrow(
      {
        where: {
          id: props.invitationId,
          hrm_time_tracking_organization_id: props.organizationId,
        },
        ...HrmTimeTrackingOrganizationInvitationTransformer.select(),
      },
    );
  return await HrmTimeTrackingOrganizationInvitationTransformer.transform(
    invitation,
  );
}
