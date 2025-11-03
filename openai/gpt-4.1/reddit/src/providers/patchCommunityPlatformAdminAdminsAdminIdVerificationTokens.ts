import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdminVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminVerificationToken";
import { IPageICommunityPlatformAdminVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminVerificationToken";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminAdminsAdminIdVerificationTokens(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: ICommunityPlatformAdminVerificationToken.IRequest;
}): Promise<IPageICommunityPlatformAdminVerificationToken.ISummary> {
  // Validate that the admin exists and is not deleted
  const adminRecord = await MyGlobal.prisma.community_platform_admins.findFirst(
    {
      where: {
        id: props.adminId,
        deleted_at: null,
      },
    },
  );
  if (!adminRecord) {
    throw new HttpException("Admin not found", 404);
  }

  // Pagination defaults and limits
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 20;

  // Sorting
  const sortable: ("created_at" | "expires_at" | "consumed" | "consumed_at")[] =
    ["created_at", "expires_at", "consumed", "consumed_at"];
  const sort_by =
    props.body.sort_by && sortable.includes(props.body.sort_by)
      ? props.body.sort_by
      : "created_at";
  const desc = !!props.body.desc;

  // Search logic (free-text across token, created_at, expires_at, consumed_at)
  const search = props.body.search ? props.body.search.trim() : undefined;
  const where = {
    community_platform_admin_id: props.adminId,
    ...(search
      ? {
          OR: [
            { token: { contains: search } },
            { created_at: { equals: search } },
            { expires_at: { equals: search } },
            { consumed_at: { equals: search } },
            {
              consumed:
                search === "true"
                  ? true
                  : search === "false"
                    ? false
                    : undefined,
            },
          ],
        }
      : {}),
  };

  const [total, tokens] = await Promise.all([
    MyGlobal.prisma.community_platform_admin_verification_tokens.count({
      where,
    }),
    MyGlobal.prisma.community_platform_admin_verification_tokens.findMany({
      where,
      orderBy: { [sort_by]: desc ? "desc" : "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const data = tokens.map((row) => ({
    id: row.id,
    community_platform_admin_id: row.community_platform_admin_id,
    token: row.token,
    expires_at: toISOStringSafe(row.expires_at),
    consumed: row.consumed,
    created_at: toISOStringSafe(row.created_at),
    consumed_at: row.consumed_at ? toISOStringSafe(row.consumed_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
