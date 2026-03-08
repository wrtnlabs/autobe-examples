import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBanRecordAtSummaryTransformer } from "../transformers/DiscussionBoardBanRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminBansUserIdDetails(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardBanRecord.ISummary> {
  const banRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findFirstOrThrow({
      where: {
        discussion_board_member_id: props.userId,
        deleted_at: null,
      },
      ...DiscussionBoardBanRecordAtSummaryTransformer.select(),
    });
  return await DiscussionBoardBanRecordAtSummaryTransformer.transform(
    banRecord,
  );
}
