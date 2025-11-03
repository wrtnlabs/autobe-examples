import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserVerificationToken";
import { IPageICommunityPlatformUserVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserVerificationToken";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserUsersUserIdVerificationTokens(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformUserVerificationToken.IRequest;
}): Promise<IPageICommunityPlatformUserVerificationToken> {
  // Authorization: user can only access their own records
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: Cannot access verification tokens for other users",
      403,
    );
  }
  const { body, userId } = props;
  const nowIso = toISOStringSafe(new Date());

  // Derive status-related filtering
  let statusWhere: Record<string, unknown> = {};
  if (body.status === "pending") {
    statusWhere = {
      consumed: false,
      expires_at: { gt: nowIso },
    };
  } else if (body.status === "consumed") {
    statusWhere = {
      consumed: true,
    };
  } else if (body.status === "expired") {
    statusWhere = {
      consumed: false,
      expires_at: { lte: nowIso },
    };
  }

  // Date filters for created_at
  let createdAtWhere: Record<string, unknown> = {};
  if (
    body.created_from !== undefined &&
    body.created_from !== null &&
    body.created_to !== undefined &&
    body.created_to !== null
  ) {
    createdAtWhere = {
      created_at: {
        gte: body.created_from,
        lte: body.created_to,
      },
    };
  } else if (body.created_from !== undefined && body.created_from !== null) {
    createdAtWhere = {
      created_at: {
        gte: body.created_from,
      },
    };
  } else if (body.created_to !== undefined && body.created_to !== null) {
    createdAtWhere = {
      created_at: {
        lte: body.created_to,
      },
    };
  }

  // Pagination with safe integer conversion
  const page = body.page ?? 1;
  const limit = body.limit ?? 30;
  const skip = (page - 1) * limit;

  // Build where clause for Prisma
  const where = {
    community_platform_user_id: userId,
    ...statusWhere,
    ...createdAtWhere,
  };

  // Run main query and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_user_verification_tokens.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_user_verification_tokens.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: rows.map((row) => {
      const item: ICommunityPlatformUserVerificationToken = {
        id: row.id,
        community_platform_user_id: row.community_platform_user_id,
        token: row.token,
        expires_at: toISOStringSafe(row.expires_at),
        consumed: row.consumed,
        created_at: toISOStringSafe(row.created_at),
      };
      if (row.consumed_at !== undefined && row.consumed_at !== null) {
        item.consumed_at = toISOStringSafe(row.consumed_at);
      }
      return item;
    }),
  };
}
