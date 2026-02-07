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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardBanAppealTransformer } from "../transformers/DiscussionBoardBanAppealTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminBanRecordsBanRecordIdAppealsAppealId(props: {
  superAdmin: SuperadminPayload;
  banRecordId: string & tags.Format<"uuid">;
  appealId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardBanAppeal> {
  const appeal = await MyGlobal.prisma.discussion_board_ban_appeals.findFirst({
    where: {
      id: props.appealId,
      discussion_board_ban_record_id: props.banRecordId,
      deleted_at: null,
    },
    ...DiscussionBoardBanAppealTransformer.select(),
  });
  if (!appeal) {
    throw new HttpException("Ban appeal not found", 404);
  }
  return await DiscussionBoardBanAppealTransformer.transform(appeal);
}
