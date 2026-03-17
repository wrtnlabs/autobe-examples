import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminPasswordResets(props: {
  admin: AdminPayload;
  body: ICommunityPlatformMemberPasswordReset.IRequest;
}): Promise<IPageICommunityPlatformMemberPasswordReset.ISummary> {
  if (props.admin.type !== "admin") {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(
    new globalThis.Date(),
  );
  const whereInput = {
    ...(props.body.id !== undefined && {
      id: props.body.id,
    }),
    ...(props.body.community_platform_member_id !== undefined && {
      community_platform_member_id: props.body.community_platform_member_id,
    }),
    ...(props.body.ip !== undefined && {
      ip: {
        contains: props.body.ip,
      },
    }),
    ...(props.body.href !== undefined && {
      href: {
        contains: props.body.href,
      },
    }),
    ...(props.body.referrer !== undefined && {
      referrer: {
        contains: props.body.referrer,
      },
    }),
    ...(props.body.created_at !== undefined && {
      created_at: props.body.created_at,
    }),
    ...(props.body.expired_at !== undefined && {
      expired_at: props.body.expired_at,
    }),
    ...(props.body.used_at !== undefined && {
      used_at: props.body.used_at,
    }),
    ...(props.body.revoked_at !== undefined && {
      revoked_at: props.body.revoked_at,
    }),
    ...(props.body.updated_at !== undefined && {
      updated_at: props.body.updated_at,
    }),
    ...(props.body.deleted_at !== undefined
      ? {
          deleted_at: props.body.deleted_at,
        }
      : props.body.includeDeleted === true
        ? {}
        : {
            deleted_at: null,
          }),
    ...((props.body.member_code !== undefined ||
      props.body.member_email !== undefined ||
      props.body.member_email_verified !== undefined ||
      props.body.member_status !== undefined) && {
      member: {
        ...(props.body.member_code !== undefined && {
          code: props.body.member_code,
        }),
        ...(props.body.member_email !== undefined && {
          email: {
            contains: props.body.member_email,
          },
        }),
        ...(props.body.member_email_verified !== undefined && {
          email_verified: props.body.member_email_verified,
        }),
        ...(props.body.member_status !== undefined && {
          status: props.body.member_status,
        }),
      },
    }),
    ...(props.body.lifecycle === "pending" && {
      used_at: null,
      revoked_at: null,
      expired_at: {
        gt: now,
      },
    }),
    ...(props.body.lifecycle === "used" && {
      used_at: {
        not: null,
      },
    }),
    ...(props.body.lifecycle === "revoked" && {
      revoked_at: {
        not: null,
      },
    }),
    ...(props.body.lifecycle === "expired" && {
      used_at: null,
      revoked_at: null,
      expired_at: {
        lte: now,
      },
    }),
  } satisfies Prisma.community_platform_member_password_resetsWhereInput;
  const orderByInput: Prisma.community_platform_member_password_resetsOrderByWithRelationInput[] =
    props.body.sort === "created_at_asc"
      ? [{ created_at: "asc" }, { id: "asc" }]
      : props.body.sort === "expired_at_desc"
        ? [{ expired_at: "desc" }, { id: "desc" }]
        : props.body.sort === "expired_at_asc"
          ? [{ expired_at: "asc" }, { id: "asc" }]
          : props.body.sort === "updated_at_desc"
            ? [{ updated_at: "desc" }, { id: "desc" }]
            : props.body.sort === "updated_at_asc"
              ? [{ updated_at: "asc" }, { id: "asc" }]
              : [{ created_at: "desc" }, { id: "desc" }];
  const selectInput = {
    id: true,
    ip: true,
    href: true,
    referrer: true,
    expired_at: true,
    used_at: true,
    revoked_at: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
    member: {
      select: {
        id: true,
        code: true,
        email: true,
        email_verified: true,
        status: true,
        last_signed_in_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  } satisfies Prisma.community_platform_member_password_resetsSelect;
  const rows =
    await MyGlobal.prisma.community_platform_member_password_resets.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: selectInput,
    });
  const total =
    await MyGlobal.prisma.community_platform_member_password_resets.count({
      where: whereInput,
    });
  return {
    data: rows.map((row) => ({
      id: row.id,
      member: {
        id: row.member.id,
        code: row.member.code,
        email: row.member.email,
        email_verified: row.member.email_verified,
        status: row.member.status,
        last_signed_in_at:
          row.member.last_signed_in_at === null
            ? null
            : toISOStringSafe(row.member.last_signed_in_at),
        created_at: toISOStringSafe(row.member.created_at),
        updated_at: toISOStringSafe(row.member.updated_at),
        deleted_at:
          row.member.deleted_at === null
            ? null
            : toISOStringSafe(row.member.deleted_at),
      },
      ip: row.ip,
      href: row.href,
      referrer: row.referrer,
      expired_at: toISOStringSafe(row.expired_at),
      used_at: row.used_at === null ? null : toISOStringSafe(row.used_at),
      revoked_at:
        row.revoked_at === null ? null : toISOStringSafe(row.revoked_at),
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at === null ? null : toISOStringSafe(row.deleted_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
