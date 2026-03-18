import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { IHrmTimeTrackingOwnerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwnerSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingOwnerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOwnerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingOwnerSessionAtSummaryTransformer } from "../transformers/HrmTimeTrackingOwnerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingOwnerSessions(props: {
  owner: OwnerPayload;
  body: IHrmTimeTrackingOwnerSession.IRequest;
}): Promise<IPageIHrmTimeTrackingOwnerSession.ISummary> {
  const authorizedSession =
    await MyGlobal.prisma.hrm_time_tracking_owner_sessions.findFirstOrThrow({
      where: {
        id: props.owner.session_id,
        hrm_time_tracking_owner_id: props.owner.id,
        expired_at: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  if (
    props.body.organizationId !== undefined &&
    props.body.organizationId !==
      authorizedSession.hrm_time_tracking_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  if (props.body.actorType !== undefined && props.body.actorType !== "owner") {
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  if (props.body.active === true && props.body.expired === true) {
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  const skip = (page - 1) * limit;
  const now = new Date();
  const search = props.body.search?.trim();
  const where = {
    hrm_time_tracking_organization_id:
      authorizedSession.hrm_time_tracking_organization_id,
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? { gte: new Date(props.body.createdAtFrom) }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? { lte: new Date(props.body.createdAtTo) }
              : {}),
          },
        }
      : {}),
    ...(props.body.ip !== undefined ? { ip: props.body.ip } : {}),
    ...(props.body.href !== undefined ? { href: props.body.href } : {}),
    ...(props.body.referrer !== undefined
      ? { referrer: props.body.referrer }
      : {}),
    ...(props.body.active === true
      ? {
          expired_at: {
            gt: now,
          },
        }
      : props.body.expired === true
        ? {
            expired_at: {
              lte: now,
            },
          }
        : {}),
    ...(search !== undefined && search.length !== 0
      ? {
          AND: [
            {
              OR: [
                { ip: { contains: search } },
                { href: { contains: search } },
                { referrer: { contains: search } },
              ],
            },
          ],
        }
      : {}),
  } satisfies Prisma.hrm_time_tracking_owner_sessionsWhereInput;
  const orderBy =
    props.body.sort === "createdAt"
      ? ({
          created_at: "asc",
        } satisfies Prisma.hrm_time_tracking_owner_sessionsOrderByWithRelationInput)
      : props.body.sort === "expiredAt"
        ? ({
            expired_at: "asc",
          } satisfies Prisma.hrm_time_tracking_owner_sessionsOrderByWithRelationInput)
        : props.body.sort === "-expiredAt"
          ? ({
              expired_at: "desc",
            } satisfies Prisma.hrm_time_tracking_owner_sessionsOrderByWithRelationInput)
          : ({
              created_at: "desc",
            } satisfies Prisma.hrm_time_tracking_owner_sessionsOrderByWithRelationInput);
  const data = await MyGlobal.prisma.hrm_time_tracking_owner_sessions.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...HrmTimeTrackingOwnerSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_tracking_owner_sessions.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmTimeTrackingOwnerSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
