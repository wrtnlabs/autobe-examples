import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardUserBanTransformer } from "../transformers/DiscussionBoardUserBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminUserBansBanId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUserBan.IUpdate;
}): Promise<IDiscussionBoardUserBan> {
  // Validate ban exists
  const ban =
    await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
      where: { id: props.banId },
    });
  // Build update data with provided fields
  const updateData: Prisma.discussion_board_user_bansUpdateInput = {};
  if (props.body.reason !== undefined) {
    updateData.reason = props.body.reason;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.expires_at !== undefined) {
    updateData.expires_at = props.body.expires_at
      ? new Date(props.body.expires_at)
      : null;
  }
  updateData.updated_at = new Date();
  // Perform update
  await MyGlobal.prisma.discussion_board_user_bans.update({
    where: { id: props.banId },
    data: updateData,
  });
  // Fetch updated ban with full details
  const updated =
    await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
      where: { id: props.banId },
      ...DiscussionBoardUserBanTransformer.select(),
    });
  return await DiscussionBoardUserBanTransformer.transform(updated);
}
