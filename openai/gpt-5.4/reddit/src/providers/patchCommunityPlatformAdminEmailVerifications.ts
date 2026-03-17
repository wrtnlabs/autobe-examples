import { ICommunityPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformMemberEmailVerificationAtSummaryTransformer } from "../transformers/CommunityPlatformMemberEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminEmailVerifications(props: {
  admin: AdminPayload;
  body: ICommunityPlatformMemberEmailVerification.IRequest;
}): Promise<IPageICommunityPlatformMemberEmailVerification.ISummary> {
  await MyGlobal.prisma.community_platform_members.findFirstOrThrow({
    where: {
      id: props.admin.id,
      deleted_at: null,
      status: "active",
    },
    select: {
      id: true,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    community_platform_member_id: props.admin.id,
    deleted_at: null,
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? { gte: props.body.createdAtFrom }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? { lte: props.body.createdAtTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.expiredAtFrom !== undefined ||
    props.body.expiredAtTo !== undefined
      ? {
          expired_at: {
            ...(props.body.expiredAtFrom !== undefined
              ? { gte: props.body.expiredAtFrom }
              : {}),
            ...(props.body.expiredAtTo !== undefined
              ? { lte: props.body.expiredAtTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.verifiedAtFrom !== undefined ||
    props.body.verifiedAtTo !== undefined
      ? {
          verified_at: {
            ...(props.body.verifiedAtFrom !== undefined
              ? { gte: props.body.verifiedAtFrom }
              : {}),
            ...(props.body.verifiedAtTo !== undefined
              ? { lte: props.body.verifiedAtTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.invalidatedAtFrom !== undefined ||
    props.body.invalidatedAtTo !== undefined ||
    props.body.invalidatedAtIsNull !== undefined
      ? {
          invalidated_at: {
            ...(props.body.invalidatedAtFrom !== undefined
              ? { gte: props.body.invalidatedAtFrom }
              : {}),
            ...(props.body.invalidatedAtTo !== undefined
              ? { lte: props.body.invalidatedAtTo }
              : {}),
            ...(props.body.invalidatedAtIsNull === true
              ? { equals: null }
              : {}),
            ...(props.body.invalidatedAtIsNull === false ? { not: null } : {}),
          },
        }
      : {}),
  } satisfies Prisma.community_platform_member_email_verificationsWhereInput;
  const orderByInput: Prisma.community_platform_member_email_verificationsOrderByWithRelationInput[] =
    props.body.sort === "created_at_asc"
      ? [{ created_at: "asc" }, { id: "asc" }]
      : props.body.sort === "created_at_desc"
        ? [{ created_at: "desc" }, { id: "desc" }]
        : props.body.sort === "expired_at_asc"
          ? [{ expired_at: "asc" }, { id: "asc" }]
          : props.body.sort === "expired_at_desc"
            ? [{ expired_at: "desc" }, { id: "desc" }]
            : [{ created_at: "desc" }, { id: "desc" }];
  const data =
    await MyGlobal.prisma.community_platform_member_email_verifications.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
        ...CommunityPlatformMemberEmailVerificationAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.community_platform_member_email_verifications.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformMemberEmailVerificationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
