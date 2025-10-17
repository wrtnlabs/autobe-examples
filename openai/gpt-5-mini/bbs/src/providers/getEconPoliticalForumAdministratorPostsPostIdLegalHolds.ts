import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIEconPoliticalForumLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumLegalHold";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconPoliticalForumLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumLegalHold";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getEconPoliticalForumAdministratorPostsPostIdLegalHolds(props: {
  administrator: AdministratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IPageIEconPoliticalForumLegalHold> {
  const { administrator, postId } = props;

  // Authorization: ensure caller is an enrolled administrator record
  const adminRecord =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: {
        registereduser_id: administrator.id,
        deleted_at: null,
      },
    });

  if (!adminRecord) {
    throw new HttpException("Unauthorized: administrator not enrolled", 403);
  }

  // Pagination defaults (no pagination params in props; use sensible defaults)
  const page = 1 as number;
  const limit = 20 as number;
  const skip = (page - 1) * limit;

  // Build the where clause: filter by post_id and active records (not soft-deleted)
  const whereCondition = {
    post_id: postId,
    deleted_at: null,
  } as const;

  // Query data and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_political_forum_legal_holds.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.econ_political_forum_legal_holds.count({
      where: whereCondition,
    }),
  ]);

  // Map Prisma results to API DTO, converting dates to ISO strings
  const data = rows.map((r) => {
    return {
      id: r.id as string & tags.Format<"uuid">,
      registereduser_id:
        r.registereduser_id === null
          ? null
          : (r.registereduser_id as string & tags.Format<"uuid">),
      post_id:
        r.post_id === null ? null : (r.post_id as string & tags.Format<"uuid">),
      thread_id:
        r.thread_id === null
          ? null
          : (r.thread_id as string & tags.Format<"uuid">),
      moderation_case_id:
        r.moderation_case_id === null
          ? null
          : (r.moderation_case_id as string & tags.Format<"uuid">),
      hold_reason: typia.assert<
        "other" | "subpoena" | "law_enforcement" | "litigation"
      >(r.hold_reason),
      hold_start: toISOStringSafe(r.hold_start),
      hold_end: r.hold_end ? toISOStringSafe(r.hold_end) : null,
      is_active: r.is_active,
      notes: r.notes ?? null,
      created_at: toISOStringSafe(r.created_at),
    };
  }) satisfies IEconPoliticalForumLegalHold[];

  const result = {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Number(Math.max(1, Math.ceil(total / limit))),
    },
    data,
  } satisfies IPageIEconPoliticalForumLegalHold;

  return result;
}
