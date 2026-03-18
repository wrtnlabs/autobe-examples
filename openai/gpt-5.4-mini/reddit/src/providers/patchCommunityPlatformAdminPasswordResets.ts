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
import { CommunityPlatformMemberPasswordResetAtSummaryTransformer } from "../transformers/CommunityPlatformMemberPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminPasswordResets(props: {
  admin: AdminPayload;
  body: ICommunityPlatformMemberPasswordReset.IRequest;
}): Promise<IPageICommunityPlatformMemberPasswordReset.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const where = {
    ...(props.body.communityPlatformMemberId !== undefined && {
      community_platform_member_id: props.body.communityPlatformMemberId,
    }),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined &&
            props.body.createdAtFrom !== null
              ? { gte: props.body.createdAtFrom }
              : {}),
            ...(props.body.createdAtTo !== undefined &&
            props.body.createdAtTo !== null
              ? { lte: props.body.createdAtTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.expiredAtFrom !== undefined ||
    props.body.expiredAtTo !== undefined
      ? {
          expired_at: {
            ...(props.body.expiredAtFrom !== undefined &&
            props.body.expiredAtFrom !== null
              ? { gte: props.body.expiredAtFrom }
              : {}),
            ...(props.body.expiredAtTo !== undefined &&
            props.body.expiredAtTo !== null
              ? { lte: props.body.expiredAtTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.usedAtFrom !== undefined || props.body.usedAtTo !== undefined
      ? {
          used_at: {
            ...(props.body.usedAtFrom !== undefined &&
            props.body.usedAtFrom !== null
              ? { gte: props.body.usedAtFrom }
              : {}),
            ...(props.body.usedAtTo !== undefined &&
            props.body.usedAtTo !== null
              ? { lte: props.body.usedAtTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.revokedAtFrom !== undefined ||
    props.body.revokedAtTo !== undefined
      ? {
          revoked_at: {
            ...(props.body.revokedAtFrom !== undefined &&
            props.body.revokedAtFrom !== null
              ? { gte: props.body.revokedAtFrom }
              : {}),
            ...(props.body.revokedAtTo !== undefined &&
            props.body.revokedAtTo !== null
              ? { lte: props.body.revokedAtTo }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.community_platform_member_password_resetsWhereInput;
  const data =
    await MyGlobal.prisma.community_platform_member_password_resets.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      ...CommunityPlatformMemberPasswordResetAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.community_platform_member_password_resets.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformMemberPasswordResetAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
