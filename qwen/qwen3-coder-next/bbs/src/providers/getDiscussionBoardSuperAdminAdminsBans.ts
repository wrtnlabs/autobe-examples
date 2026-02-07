import { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminAdminsBans(props: {
  superAdmin: SuperadminPayload;
}): Promise<Array<IDiscussionBoardBansBanRecord.ISummary>> {
  const bans = await MyGlobal.prisma.discussion_board_bans_ban_records.findMany(
    {
      where: { deleted_at: null },
      include: {
        user: true,
        admin: true,
      },
      orderBy: { created_at: "desc" },
    },
  );
  return bans.map((ban) => ({
    id: ban.id as string & tags.Format<"uuid">,
    user_id: ban.user_id as string & tags.Format<"uuid">,
    admin_id: ban.admin_id as string & tags.Format<"uuid">,
    reason: ban.reason,
    start_time: toISOStringSafe(ban.start_time) as string &
      tags.Format<"date-time">,
    end_time: ban.end_time
      ? (toISOStringSafe(ban.end_time) as string & tags.Format<"date-time">)
      : null,
    created_at: toISOStringSafe(ban.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(ban.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: ban.deleted_at
      ? (toISOStringSafe(ban.deleted_at) as string & tags.Format<"date-time">)
      : null,
  }));
}
