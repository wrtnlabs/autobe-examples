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

export async function getEconPoliticalForumAdministratorThreadsThreadIdLegalHolds(props: {
  administrator: AdministratorPayload;
  threadId: string & tags.Format<"uuid">;
}): Promise<IPageIEconPoliticalForumLegalHold> {
  const { administrator, threadId } = props;

  // Authorization: verify administrator enrollment
  const admin =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: { registereduser_id: administrator.id, deleted_at: null },
    });
  if (admin === null) throw new HttpException("Unauthorized", 403);

  // Ensure thread exists and is not deleted
  try {
    await MyGlobal.prisma.econ_political_forum_threads.findFirstOrThrow({
      where: { id: threadId, deleted_at: null },
    });
  } catch (err) {
    throw new HttpException("Thread not found", 404);
  }

  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.econ_political_forum_legal_holds.findMany({
        where: { thread_id: threadId },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      MyGlobal.prisma.econ_political_forum_legal_holds.count({
        where: { thread_id: threadId },
      }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      registereduser_id: r.registereduser_id ?? null,
      post_id: r.post_id ?? null,
      thread_id: r.thread_id ?? null,
      moderation_case_id: r.moderation_case_id ?? null,
      hold_reason: typia.assert<
        "other" | "subpoena" | "law_enforcement" | "litigation"
      >(r.hold_reason),
      hold_start: toISOStringSafe(r.hold_start),
      hold_end: r.hold_end ? toISOStringSafe(r.hold_end) : null,
      is_active: r.is_active,
      notes: r.notes ?? null,
      created_at: toISOStringSafe(r.created_at),
    }));

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages: Math.ceil(total / limit),
      },
      data,
    } as IPageIEconPoliticalForumLegalHold;
  } catch (error) {
    throw new HttpException("Internal Server Error", 500);
  }
}
