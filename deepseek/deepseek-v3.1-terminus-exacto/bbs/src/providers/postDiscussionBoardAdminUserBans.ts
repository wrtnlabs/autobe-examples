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
import { DiscussionBoardUserBanCollector } from "../collectors/DiscussionBoardUserBanCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardUserBanTransformer } from "../transformers/DiscussionBoardUserBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminUserBans(props: {
  admin: AdminPayload;
  body: IDiscussionBoardUserBan.ICreate;
}): Promise<IDiscussionBoardUserBan> {
  // Check if member exists
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.body.member_id, deleted_at: null },
  });
  if (!member) {
    throw new HttpException("Member not found", 404);
  }
  // Check if member is already banned (active status)
  const existingBan =
    await MyGlobal.prisma.discussion_board_user_bans.findFirst({
      where: {
        member_id: props.body.member_id,
        status: "active",
        deleted_at: null,
      },
    });
  if (existingBan) {
    throw new HttpException("Member is already banned", 400);
  }
  // Create ban using collector with proper IEntity types
  const collectorInput = {
    body: props.body,
    discussionBoardAdmins: {
      id: props.admin.id,
    } satisfies IEntity,
    discussionBoardAdminSessions: {
      id: props.admin.session_id,
    } satisfies IEntity,
  };
  const ban = await MyGlobal.prisma.discussion_board_user_bans.create({
    data: await DiscussionBoardUserBanCollector.collect(collectorInput),
    ...DiscussionBoardUserBanTransformer.select(),
  });
  return await DiscussionBoardUserBanTransformer.transform(ban);
}
