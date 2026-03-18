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
import { HrmTimeTrackingOrganizationInvitationCollector } from "../collectors/HrmTimeTrackingOrganizationInvitationCollector";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingOrganizationInvitationTransformer } from "../transformers/HrmTimeTrackingOrganizationInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitations(props: {
  owner: OwnerPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingOrganizationInvitation.ICreate;
}): Promise<IHrmTimeTrackingOrganizationInvitation> {
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (organization.deleted_at !== null) {
    throw new HttpException("Organization not found", 404);
  }
  if (props.body.hrm_time_tracking_role_id != null) {
    const role = await MyGlobal.prisma.hrm_time_tracking_roles.findUnique({
      where: {
        id: props.body.hrm_time_tracking_role_id,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
        deleted_at: true,
      },
    });
    if (
      role === null ||
      role.deleted_at !== null ||
      role.hrm_time_tracking_organization_id !== props.organizationId
    ) {
      throw new HttpException("Invalid role selection", 400);
    }
  }
  const normalizedEmail = props.body.email.trim().toLowerCase();
  const existing =
    await MyGlobal.prisma.hrm_time_tracking_organization_invitations.findFirst({
      where: {
        hrm_time_tracking_organization_id: props.organizationId,
        email: normalizedEmail,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (existing !== null) {
    throw new HttpException(
      "This organization already has an invitation for that email address",
      409,
    );
  }
  try {
    const created = await MyGlobal.prisma.$transaction(async (tx) =>
      tx.hrm_time_tracking_organization_invitations.create({
        data: await HrmTimeTrackingOrganizationInvitationCollector.collect({
          body: {
            email: normalizedEmail,
            hrm_time_tracking_role_id:
              props.body.hrm_time_tracking_role_id ?? null,
            message: props.body.message ?? null,
          },
          organization: {
            id: organization.id,
          },
        }),
        ...HrmTimeTrackingOrganizationInvitationTransformer.select(),
      }),
    );
    return await HrmTimeTrackingOrganizationInvitationTransformer.transform(
      created,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "This organization already has an invitation for that email address",
        409,
      );
    }
    throw error;
  }
}
