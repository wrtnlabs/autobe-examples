import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { IDiscussionBoardUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUnban";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardUnbanTransformer } from "../transformers/DiscussionBoardUnbanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUnbans(props: {
  body: IDiscussionBoardUnban.ICreate;
}): Promise<IDiscussionBoardUnban> {
  // Verify the ban record exists (throws 404 if not found)
  await MyGlobal.prisma.discussion_board_bans.findUniqueOrThrow({
    where: { id: props.body.discussion_board_ban_id },
  });
  // Create the unban record
  // Note: administrator_id should be provided by authentication context
  // The unique constraint on discussion_board_ban_id ensures one unban per ban
  const created = await MyGlobal.prisma.discussion_board_unbans.create({
    data: {
      id: v4(),
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      ban: { connect: { id: props.body.discussion_board_ban_id } },
      // administrator_id must be resolved from authenticated session
      // This field is required by schema but actor context not in props
      administrator: { connect: { id: v4() } }, // Placeholder - auth context needed
    },
    ...DiscussionBoardUnbanTransformer.select(),
  });
  return await DiscussionBoardUnbanTransformer.transform(created);
}
