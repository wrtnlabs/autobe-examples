import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { DiscussionBoardUserBanTransformer } from "../transformers/DiscussionBoardUserBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdministratorAdministratorBans(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardUserBan.ICreate;
}): Promise<IDiscussionBoardUserBan> {
  // Verify user existence and ban status
  const user =
    await MyGlobal.prisma.discussion_board_registered_users.findUnique({
      where: { id: props.body.registeredUserId },
      select: { id: true, is_banned: true },
    });
  if (user === null) {
    throw new HttpException("User not found", 404);
  }
  if (user.is_banned === true) {
    throw new HttpException("User is already banned", 400);
  }
  // Generate timestamps and id
  const nowISOString = new Date().toISOString() as string &
    tags.Format<"date-time">;
  const id = v4() as string & tags.Format<"uuid">;
  // Create ban record using collector style data inline
  await MyGlobal.prisma.discussion_board_user_bans.create({
    data: {
      id,
      registeredUser: { connect: { id: props.body.registeredUserId } },
      administrator: { connect: { id: props.superAdministrator.id } },
      reason: props.body.reason,
      banned_at: nowISOString,
      created_at: nowISOString,
      updated_at: nowISOString,
      deleted_at: null,
    },
  });
  // Update user's ban flag
  await MyGlobal.prisma.discussion_board_registered_users.update({
    where: { id: props.body.registeredUserId },
    data: { is_banned: true },
  });
  // Retrieve created ban record and transform
  const createdBan =
    await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
      where: { id },
      ...DiscussionBoardUserBanTransformer.select(),
    });
  return await DiscussionBoardUserBanTransformer.transform(createdBan);
}
