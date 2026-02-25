import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBanAppealTransformer } from "../transformers/DiscussionBoardBanAppealTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminBansBanIdAppealsAppealId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
  appealId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardBanAppeal> {
  // Fetch appeal with proper validation that it belongs to the specified ban
  const appeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.findFirstOrThrow({
      where: {
        id: props.appealId,
        discussion_board_ban_record_id: props.banId,
        deleted_at: null,
      },
      ...DiscussionBoardBanAppealTransformer.select(),
    });
  return await DiscussionBoardBanAppealTransformer.transform(appeal);
}
