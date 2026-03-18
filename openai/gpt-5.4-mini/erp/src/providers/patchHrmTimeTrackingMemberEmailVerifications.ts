import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberEmailVerification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingMemberEmailVerification.IRequest;
}): Promise<IPageIHrmTimeTrackingMemberEmailVerification.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const toDate = (value: string & tags.Format<"date-time">): Date =>
    new Date(value);
  const createdAtRange:
    | {
        gte?: Date;
        lte?: Date;
      }
    | undefined =
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          ...(props.body.createdAtFrom !== undefined && {
            gte: toDate(props.body.createdAtFrom),
          }),
          ...(props.body.createdAtTo !== undefined && {
            lte: toDate(props.body.createdAtTo),
          }),
        }
      : undefined;
  const verifiedAtRange:
    | {
        gte?: Date;
        lte?: Date;
      }
    | undefined =
    props.body.verifiedAtFrom !== undefined ||
    props.body.verifiedAtTo !== undefined
      ? {
          ...(props.body.verifiedAtFrom !== undefined && {
            gte: toDate(props.body.verifiedAtFrom),
          }),
          ...(props.body.verifiedAtTo !== undefined && {
            lte: toDate(props.body.verifiedAtTo),
          }),
        }
      : undefined;
  const now: number = Date.now();
  const where: Prisma.hrm_time_tracking_member_email_verificationsWhereInput = {
    deleted_at: props.body.includeDeleted === true ? undefined : null,
    ...(props.body.memberId !== undefined && {
      member_id: props.body.memberId,
    }),
    ...(props.body.email !== undefined && {
      member: { email: props.body.email },
    }),
    ...(props.body.token !== undefined && { token: props.body.token }),
    ...(props.body.status === "verified" && { verified_at: { not: null } }),
    ...(props.body.status === "pending" && {
      verified_at: null,
      expired_at: { gt: new Date(now) },
    }),
    ...(props.body.status === "expired" && {
      verified_at: null,
      expired_at: { lt: new Date(now) },
    }),
    ...(props.body.expired === true && {
      verified_at: null,
      expired_at: { lt: new Date(now) },
    }),
    ...(props.body.expired === false && {
      OR: [
        { verified_at: { not: null } },
        { expired_at: { gte: new Date(now) } },
      ],
    }),
    ...(createdAtRange !== undefined && { created_at: createdAtRange }),
    ...(verifiedAtRange !== undefined && { verified_at: verifiedAtRange }),
    member: {
      id: props.member.id,
    },
  };
  const [records, total] = [
    await MyGlobal.prisma.hrm_time_tracking_member_email_verifications.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        select: {
          id: true,
          member: {
            select: {
              id: true,
              email: true,
              is_active: true,
              last_login_at: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          created_at: true,
          expired_at: true,
          verified_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    ),
    await MyGlobal.prisma.hrm_time_tracking_member_email_verifications.count({
      where,
    }),
  ];
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map(
      (record): IHrmTimeTrackingMemberEmailVerification.ISummary => ({
        id: record.id,
        member: {
          id: record.member.id,
          email: record.member.email,
          is_active: record.member.is_active,
          last_login_at: record.member.last_login_at?.toISOString() ?? null,
          created_at: record.member.created_at.toISOString(),
          updated_at: record.member.updated_at.toISOString(),
          deleted_at: record.member.deleted_at?.toISOString() ?? null,
        },
        createdAt: record.created_at.toISOString(),
        expiredAt: record.expired_at.toISOString(),
        verifiedAt: record.verified_at?.toISOString() ?? null,
        updatedAt: record.updated_at.toISOString(),
        deletedAt: record.deleted_at?.toISOString() ?? null,
        status:
          record.verified_at !== null
            ? "verified"
            : record.expired_at.getTime() < now
              ? "expired"
              : "pending",
      }),
    ),
  };
}
