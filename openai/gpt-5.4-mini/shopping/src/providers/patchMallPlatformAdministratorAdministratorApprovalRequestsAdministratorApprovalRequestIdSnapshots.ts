import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { IMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequestSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorApprovalRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorAdministratorApprovalRequestsAdministratorApprovalRequestIdSnapshots(props: {
  administrator: AdministratorPayload;
  administratorApprovalRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformAdministratorApprovalRequestSnapshot.IRequest;
}): Promise<IPageIMallPlatformAdministratorApprovalRequestSnapshot.ISummary> {
  const parent =
    await MyGlobal.prisma.mall_platform_administrator_approval_requests.findUniqueOrThrow(
      {
        where: {
          id: props.administratorApprovalRequestId,
        },
        select: {
          id: true,
          administrator_id: true,
        },
      },
    );
  if (
    parent.administrator_id !== props.administrator.id &&
    props.administrator.type !== "administrator"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    administrator_approval_request_id: props.administratorApprovalRequestId,
    ...(props.body.snapshotReason !== undefined
      ? {
          snapshot_reason: {
            contains: props.body.snapshotReason,
            mode: "insensitive" as Prisma.QueryMode,
          },
        }
      : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [
            {
              snapshot_reason: {
                contains: props.body.search,
                mode: "insensitive" as Prisma.QueryMode,
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.mall_platform_administrator_approval_request_snapshotsWhereInput;
  const data =
    await MyGlobal.prisma.mall_platform_administrator_approval_request_snapshots.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy: {
          created_at: "asc",
        },
        select: {
          id: true,
          administratorApprovalRequest: {
            select: {
              id: true,
              administrator: {
                select: {
                  id: true,
                  email: true,
                  grade: true,
                  status: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              reviewerAdministrator: {
                select: {
                  id: true,
                  email: true,
                  grade: true,
                  status: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              reason: true,
              status: true,
              rejection_reason: true,
              reviewed_at: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          snapshot_reason: true,
          created_at: true,
        },
      },
    );
  const total =
    await MyGlobal.prisma.mall_platform_administrator_approval_request_snapshots.count(
      {
        where,
      },
    );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((snapshot) => ({
      id: snapshot.id,
      administratorApprovalRequest: {
        id: snapshot.administratorApprovalRequest.id,
        administrator: {
          id: snapshot.administratorApprovalRequest.administrator.id,
          email: snapshot.administratorApprovalRequest.administrator.email,
          grade: snapshot.administratorApprovalRequest.administrator.grade,
          status: snapshot.administratorApprovalRequest.administrator.status,
          createdAt:
            snapshot.administratorApprovalRequest.administrator.created_at.toISOString(),
          updatedAt:
            snapshot.administratorApprovalRequest.administrator.updated_at.toISOString(),
          deletedAt:
            snapshot.administratorApprovalRequest.administrator.deleted_at?.toISOString() ??
            null,
        },
        reviewerAdministrator:
          snapshot.administratorApprovalRequest.reviewerAdministrator === null
            ? null
            : {
                id: snapshot.administratorApprovalRequest.reviewerAdministrator
                  .id,
                email:
                  snapshot.administratorApprovalRequest.reviewerAdministrator
                    .email,
                grade:
                  snapshot.administratorApprovalRequest.reviewerAdministrator
                    .grade,
                status:
                  snapshot.administratorApprovalRequest.reviewerAdministrator
                    .status,
                createdAt:
                  snapshot.administratorApprovalRequest.reviewerAdministrator.created_at.toISOString(),
                updatedAt:
                  snapshot.administratorApprovalRequest.reviewerAdministrator.updated_at.toISOString(),
                deletedAt:
                  snapshot.administratorApprovalRequest.reviewerAdministrator.deleted_at?.toISOString() ??
                  null,
              },
        reason: snapshot.administratorApprovalRequest.reason,
        status: snapshot.administratorApprovalRequest.status,
        rejectionReason: snapshot.administratorApprovalRequest.rejection_reason,
        reviewedAt:
          snapshot.administratorApprovalRequest.reviewed_at?.toISOString() ??
          null,
        createdAt:
          snapshot.administratorApprovalRequest.created_at.toISOString(),
        updatedAt:
          snapshot.administratorApprovalRequest.updated_at.toISOString(),
        deletedAt:
          snapshot.administratorApprovalRequest.deleted_at?.toISOString() ??
          null,
      },
      snapshotReason: snapshot.snapshot_reason,
      createdAt: snapshot.created_at.toISOString(),
    })),
  };
}
