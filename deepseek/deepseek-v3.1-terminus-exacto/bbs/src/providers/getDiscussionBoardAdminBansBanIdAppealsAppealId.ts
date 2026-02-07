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
  const appeal = await MyGlobal.prisma.discussion_board_ban_appeals.findUnique({
    where: {
      id: props.appealId,
    },
    ...DiscussionBoardBanAppealTransformer.select(),
  });
  if (!appeal) {
    throw new HttpException("Ban appeal not found", 404);
  }
  // Verify that the appeal belongs to the specified ban
  if (appeal.banRecord.id !== props.banId) {
    throw new HttpException(
      "Ban appeal does not belong to the specified ban",
      404,
    );
  }
  // Check if the appeal is soft-deleted
  if (appeal.deleted_at !== null) {
    throw new HttpException("Ban appeal not found", 404);
  }
  return await DiscussionBoardBanAppealTransformer.transform(appeal);
}
