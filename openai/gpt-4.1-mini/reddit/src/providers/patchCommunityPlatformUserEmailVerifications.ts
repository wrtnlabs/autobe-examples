import { ICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserEmailVerifications(props: {
  user: UserPayload;
  body: ICommunityPlatformUserEmailVerification.IRequest;
}): Promise<IPageICommunityPlatformUserEmailVerification.ISummary> {
  if (props.user.type !== "user") {
    throw new HttpException("Forbidden", 403);
  }
  // Because page and limit are not properties of IRequest, but we want to support pagination with default values
  // we safely extract them from body with unknown cast
  const body = props.body as unknown as {
    page?: number;
    limit?: number;
  };
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.community_platform_user_email_verificationsWhereInput =
    {};
  const orderBy: Prisma.community_platform_user_email_verificationsOrderByWithRelationInput =
    {
      created_at: "desc",
    };
  const total =
    await MyGlobal.prisma.community_platform_user_email_verifications.count({
      where,
    });
  const rawData =
    await MyGlobal.prisma.community_platform_user_email_verifications.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        token: true,
        user_id: true,
        is_verified: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
      },
    });
  const data = rawData.map((item) => ({
    id: item.id,
    token: item.token,
    user_id: item.user_id,
    is_verified: item.is_verified,
    expires_at: toISOStringSafe(item.expires_at),
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
