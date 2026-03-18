import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingOrganizationInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationInvitation";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingOrganizationInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganizationInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingOrganizationInvitationAtSummaryTransformer } from "../transformers/HrmTimeTrackingOrganizationInvitationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitations(props: {
  owner: OwnerPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingOrganizationInvitation.IRequest;
}): Promise<IPageIHrmTimeTrackingOrganizationInvitation.ISummary> {
  props.owner;
  await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    hrm_time_tracking_organization_id: props.organizationId,
    deleted_at: null,
    ...(props.body.search !== undefined
      ? {
          OR: [
            {
              email: {
                contains: props.body.search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              message: {
                contains: props.body.search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }
      : {}),
    ...(props.body.email !== undefined
      ? {
          email: {
            contains: props.body.email,
            mode: Prisma.QueryMode.insensitive,
          },
        }
      : {}),
    ...(props.body.status !== undefined
      ? {
          status: props.body.status,
        }
      : {}),
    ...(props.body.invitedFrom !== undefined ||
    props.body.invitedTo !== undefined
      ? {
          invited_at: {
            ...(props.body.invitedFrom !== undefined
              ? { gte: props.body.invitedFrom }
              : {}),
            ...(props.body.invitedTo !== undefined
              ? { lte: props.body.invitedTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.acceptedFrom !== undefined ||
    props.body.acceptedTo !== undefined
      ? {
          accepted_at: {
            ...(props.body.acceptedFrom !== undefined
              ? { gte: props.body.acceptedFrom }
              : {}),
            ...(props.body.acceptedTo !== undefined
              ? { lte: props.body.acceptedTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.resolvedFrom !== undefined ||
    props.body.resolvedTo !== undefined
      ? {
          resolved_at: {
            ...(props.body.resolvedFrom !== undefined
              ? { gte: props.body.resolvedFrom }
              : {}),
            ...(props.body.resolvedTo !== undefined
              ? { lte: props.body.resolvedTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.expiredFrom !== undefined ||
    props.body.expiredTo !== undefined
      ? {
          expired_at: {
            ...(props.body.expiredFrom !== undefined
              ? { gte: props.body.expiredFrom }
              : {}),
            ...(props.body.expiredTo !== undefined
              ? { lte: props.body.expiredTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.cancelledFrom !== undefined ||
    props.body.cancelledTo !== undefined
      ? {
          cancelled_at: {
            ...(props.body.cancelledFrom !== undefined
              ? { gte: props.body.cancelledFrom }
              : {}),
            ...(props.body.cancelledTo !== undefined
              ? { lte: props.body.cancelledTo }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.hrm_time_tracking_organization_invitationsWhereInput;
  const orderBy = (
    props.body.sort === "invited_at_asc"
      ? [
          { invited_at: Prisma.SortOrder.asc },
          { created_at: Prisma.SortOrder.desc },
          { id: Prisma.SortOrder.desc },
        ]
      : props.body.sort === "invited_at_desc"
        ? [
            { invited_at: Prisma.SortOrder.desc },
            { created_at: Prisma.SortOrder.desc },
            { id: Prisma.SortOrder.desc },
          ]
        : props.body.sort === "email_asc"
          ? [
              { email: Prisma.SortOrder.asc },
              { created_at: Prisma.SortOrder.desc },
              { id: Prisma.SortOrder.desc },
            ]
          : props.body.sort === "email_desc"
            ? [
                { email: Prisma.SortOrder.desc },
                { created_at: Prisma.SortOrder.desc },
                { id: Prisma.SortOrder.desc },
              ]
            : props.body.sort === "status_asc"
              ? [
                  { status: Prisma.SortOrder.asc },
                  { created_at: Prisma.SortOrder.desc },
                  { id: Prisma.SortOrder.desc },
                ]
              : props.body.sort === "status_desc"
                ? [
                    { status: Prisma.SortOrder.desc },
                    { created_at: Prisma.SortOrder.desc },
                    { id: Prisma.SortOrder.desc },
                  ]
                : [
                    { created_at: Prisma.SortOrder.desc },
                    { id: Prisma.SortOrder.desc },
                  ]
  ) satisfies Prisma.hrm_time_tracking_organization_invitationsOrderByWithRelationInput[];
  const records =
    await MyGlobal.prisma.hrm_time_tracking_organization_invitations.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...HrmTimeTrackingOrganizationInvitationAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.hrm_time_tracking_organization_invitations.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackingOrganizationInvitationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
