import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorCommunityBansBatch(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformCommunityBan.ICreateBatch;
}): Promise<IPageICommunityPlatformCommunityBan.ISummary> {
  if (!Array.isArray(props.body) || props.body.length === 0) {
    throw new HttpException("Request body must be a non-empty array.", 400);
  }
  const nowISOString = toISOStringSafe(new Date());
  const createData: {
    id: string & tags.Format<"uuid">;
    user_id: string & tags.Format<"uuid">;
    community_id: string & tags.Format<"uuid">;
    banned_at: string & tags.Format<"date-time">;
    unbanned_at: string | null;
    reason: string | null;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
    deleted_at: string | null;
  }[] = props.body.map((ban) => {
    if (!ban.user_id) {
      throw new HttpException("Each ban entry must have a user_id.", 400);
    }
    if (!ban.community_id) {
      throw new HttpException("Each ban entry must have a community_id.", 400);
    }
    if (!ban.banned_at) {
      throw new HttpException(
        "Each ban entry must have a banned_at timestamp.",
        400,
      );
    }
    const id = v4();
    // id is string & tags.Format<'uuid'> per v4() output compliant with UUID string
    return {
      id,
      user_id: ban.user_id,
      community_id: ban.community_id,
      banned_at: ban.banned_at,
      unbanned_at: ban.unbanned_at ?? null,
      reason: ban.reason ?? null,
      created_at: nowISOString,
      updated_at: nowISOString,
      deleted_at: null,
    };
  });
  try {
    await MyGlobal.prisma.$transaction(async (prisma) => {
      await prisma.community_platform_community_bans.createMany({
        data: createData,
        skipDuplicates: true,
      });
    });
  } catch (error) {
    throw new HttpException(
      `Failed to create batch community bans: ${(error as Error).message}`,
      500,
    );
  }
  // Collect all generated IDs
  const ids = createData.map((record) => record.id);
  // Query created records
  const bans = await MyGlobal.prisma.community_platform_community_bans.findMany(
    {
      where: { id: { in: ids }, deleted_at: null },
      orderBy: { created_at: "desc" },
    },
  );
  const count = bans.length;
  return {
    pagination: {
      current: 1,
      limit: count,
      records: count,
      pages: 1,
    },
    data: bans.map((ban) => ({
      id: ban.id,
      user_id: ban.user_id,
      community_id: ban.community_id,
      banned_at: ban.banned_at,
      unbanned_at: ban.unbanned_at ?? null,
      reason: ban.reason ?? null,
      created_at: ban.created_at,
      updated_at: ban.updated_at,
      deleted_at: ban.deleted_at ?? null,
    })),
  };
}
