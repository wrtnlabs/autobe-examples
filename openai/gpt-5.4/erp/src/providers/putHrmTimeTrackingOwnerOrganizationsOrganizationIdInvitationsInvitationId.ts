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

export async function putHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitationsInvitationId(props: {
  owner: OwnerPayload;
  organizationId: string & tags.Format<"uuid">;
  invitationId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingOrganizationInvitation.IUpdate;
}): Promise<IHrmTimeTrackingOrganizationInvitation> {
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
    await MyGlobal.prisma.hrm_time_tracking_organization_invitations.findFirstOrThrow(
      {
        where: {
          id: props.invitationId,
          hrm_time_tracking_organization_id: props.organizationId,
          deleted_at: null,
        },
        select: {
          id: true,
          status: true,
          accepted_at: true,
          resolved_at: true,
          expired_at: true,
          cancelled_at: true,
        },
      },
    );
  if (
    props.body.hrm_time_tracking_role_id !== undefined &&
    props.body.hrm_time_tracking_role_id !== null
  ) {
    await MyGlobal.prisma.hrm_time_tracking_roles.findFirstOrThrow({
      where: {
        id: props.body.hrm_time_tracking_role_id,
        hrm_time_tracking_organization_id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  }
  const nextStatus = props.body.status ?? invitation.status;
  const acceptedAtProvided = props.body.accepted_at !== undefined;
  const resolvedAtProvided = props.body.resolved_at !== undefined;
  const expiredAtProvided = props.body.expired_at !== undefined;
  const cancelledAtProvided = props.body.cancelled_at !== undefined;
  const acceptedAtPresent = acceptedAtProvided
    ? props.body.accepted_at !== null
    : invitation.accepted_at !== null;
  const resolvedAtPresent = resolvedAtProvided
    ? props.body.resolved_at !== null
    : invitation.resolved_at !== null;
  const expiredAtPresent = expiredAtProvided
    ? props.body.expired_at !== null
    : invitation.expired_at !== null;
  const cancelledAtPresent = cancelledAtProvided
    ? props.body.cancelled_at !== null
    : invitation.cancelled_at !== null;
  if (nextStatus === "pending") {
    if (
      acceptedAtPresent ||
      resolvedAtPresent ||
      expiredAtPresent ||
      cancelledAtPresent
    ) {
      throw new HttpException(
        "Pending invitation cannot have finalized lifecycle timestamps",
        400,
      );
    }
  } else if (nextStatus === "accepted") {
    if (acceptedAtPresent === false) {
      throw new HttpException("Accepted invitation requires accepted_at", 400);
    }
    if (expiredAtPresent || cancelledAtPresent) {
      throw new HttpException(
        "Accepted invitation cannot be expired or cancelled",
        400,
      );
    }
  } else if (nextStatus === "resolved") {
    if (resolvedAtPresent === false) {
      throw new HttpException("Resolved invitation requires resolved_at", 400);
    }
    if (expiredAtPresent || cancelledAtPresent) {
      throw new HttpException(
        "Resolved invitation cannot be expired or cancelled",
        400,
      );
    }
  } else if (nextStatus === "expired") {
    if (expiredAtPresent === false) {
      throw new HttpException("Expired invitation requires expired_at", 400);
    }
    if (acceptedAtPresent || resolvedAtPresent || cancelledAtPresent) {
      throw new HttpException(
        "Expired invitation cannot also be accepted, resolved, or cancelled",
        400,
      );
    }
  } else if (nextStatus === "cancelled") {
    if (cancelledAtPresent === false) {
      throw new HttpException(
        "Cancelled invitation requires cancelled_at",
        400,
      );
    }
    if (acceptedAtPresent || resolvedAtPresent || expiredAtPresent) {
      throw new HttpException(
        "Cancelled invitation cannot also be accepted, resolved, or expired",
        400,
      );
    }
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_time_tracking_organization_invitations.update({
      where: {
        id: props.invitationId,
      },
      data: {
        ...(props.body.hrm_time_tracking_role_id !== undefined
          ? {
              role:
                props.body.hrm_time_tracking_role_id === null
                  ? { disconnect: true }
                  : { connect: { id: props.body.hrm_time_tracking_role_id } },
            }
          : {}),
        ...(props.body.status !== undefined
          ? {
              status: props.body.status,
            }
          : {}),
        ...(props.body.message !== undefined
          ? {
              message: props.body.message,
            }
          : {}),
        ...(props.body.accepted_at !== undefined
          ? {
              accepted_at: props.body.accepted_at,
            }
          : {}),
        ...(props.body.resolved_at !== undefined
          ? {
              resolved_at: props.body.resolved_at,
            }
          : {}),
        ...(props.body.expired_at !== undefined
          ? {
              expired_at: props.body.expired_at,
            }
          : {}),
        ...(props.body.cancelled_at !== undefined
          ? {
              cancelled_at: props.body.cancelled_at,
            }
          : {}),
      },
    });
    return await tx.hrm_time_tracking_organization_invitations.findUniqueOrThrow(
      {
        where: {
          id: props.invitationId,
        },
        ...HrmTimeTrackingOrganizationInvitationTransformer.select(),
      },
    );
  });
  return await HrmTimeTrackingOrganizationInvitationTransformer.transform(
    updated,
  );
}
