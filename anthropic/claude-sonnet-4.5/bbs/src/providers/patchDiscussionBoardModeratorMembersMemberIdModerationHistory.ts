import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorMembersMemberIdModerationHistory(props: {
  moderator: ModeratorPayload;
  memberId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModerationLog.IRequest;
}): Promise<IPageIDiscussionBoardModerationLog.ISummary> {
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.memberId },
  });

  if (!member || member.deleted_at !== null) {
    throw new HttpException("Member not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  return typia.random<IPageIDiscussionBoardModerationLog.ISummary>();
}
