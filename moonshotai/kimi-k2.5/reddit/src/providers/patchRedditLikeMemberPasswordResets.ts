import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMemberPasswordReset";
import { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
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

export async function patchRedditLikeMemberPasswordResets(props: {
  member: AdminPayload;
  body: IRedditLikeMemberPasswordReset.IRequest;
}): Promise<IPageIRedditLikeMemberPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const now = new Date().toISOString();
  const whereInput: Prisma.reddit_like_member_password_resetsWhereInput = {
    reddit_like_member_id: props.member.id,
    ...(props.body.createdAtFrom !== undefined &&
      props.body.createdAtFrom !== null && {
        created_at: { gte: props.body.createdAtFrom },
      }),
    ...(props.body.createdAtTo !== undefined &&
      props.body.createdAtTo !== null && {
        created_at: { lte: props.body.createdAtTo },
      }),
    ...(props.body.status === "PENDING" && {
      used_at: null,
      expires_at: { gt: now },
    }),
    ...(props.body.status === "USED" && {
      used_at: { not: null },
    }),
    ...(props.body.status === "EXPIRED" && {
      used_at: null,
      expires_at: { lte: now },
    }),
  } satisfies Prisma.reddit_like_member_password_resetsWhereInput;
  const records =
    await MyGlobal.prisma.reddit_like_member_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const totalRecords =
    await MyGlobal.prisma.reddit_like_member_password_resets.count({
      where: whereInput,
    });
  const data = records.map((record) => {
    const expiresAtStr = toISOStringSafe(record.expires_at);
    const usedAtStr =
      record.used_at !== null ? toISOStringSafe(record.used_at) : null;
    let status: "pending" | "used" | "expired";
    if (usedAtStr !== null) {
      status = "used";
    } else if (expiresAtStr > now) {
      status = "pending";
    } else {
      status = "expired";
    }
    return {
      id: record.id,
      status,
      createdAt: toISOStringSafe(record.created_at),
      expiresAt: expiresAtStr,
      usedAt: usedAtStr,
      ipAddress: record.ip_address,
      userAgent: record.user_agent,
    } satisfies IRedditLikeMemberPasswordReset.ISummary;
  });
  const pages = Math.ceil(totalRecords / limit);
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: pages,
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditLikeMemberPasswordReset.ISummary;
}
