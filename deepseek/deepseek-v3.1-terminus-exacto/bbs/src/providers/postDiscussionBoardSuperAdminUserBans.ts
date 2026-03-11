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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardUserBanTransformer } from "../transformers/DiscussionBoardUserBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminUserBans(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardUserBan.ICreate;
}): Promise<IDiscussionBoardUserBan> {
  // Validate target member exists
  await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
    where: { id: props.body.member_id, deleted_at: null },
  });
  // Check member not already actively banned
  const existingBan =
    await MyGlobal.prisma.discussion_board_user_bans.findFirst({
      where: {
        member_id: props.body.member_id,
        status: "active",
        deleted_at: null,
      },
    });
  if (existingBan) {
    throw new HttpException("Member already has an active ban", 400);
  }
  // Create ban using collector
  const created = await MyGlobal.prisma.discussion_board_user_bans.create({
    data: await DiscussionBoardUserBanCollector.collect({
      body: props.body,
      discussionBoardAdmins: { id: props.superAdmin.id },
      discussionBoardAdminSessions: { id: props.superAdmin.session_id },
    }),
    ...DiscussionBoardUserBanTransformer.select(),
  });
  // Return transformed response
  return await DiscussionBoardUserBanTransformer.transform(created);
}
