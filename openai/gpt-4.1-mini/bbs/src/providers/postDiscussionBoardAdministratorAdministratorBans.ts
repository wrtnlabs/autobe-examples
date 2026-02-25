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
import { DiscussionBoardUserBanCollector } from "../collectors/DiscussionBoardUserBanCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardUserBanTransformer } from "../transformers/DiscussionBoardUserBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorAdministratorBans(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardUserBan.ICreate;
}): Promise<IDiscussionBoardUserBan> {
  // Check if user exists
  const user =
    await MyGlobal.prisma.discussion_board_registered_users.findUnique({
      where: { id: props.body.registeredUserId },
    });
  if (!user) {
    throw new HttpException("User to be banned does not exist.", 400);
  }
  // Check if user is already banned
  const existingBan =
    await MyGlobal.prisma.discussion_board_user_bans.findFirst({
      where: {
        registered_user_id: props.body.registeredUserId,
        deleted_at: null,
      },
    });
  if (existingBan) {
    throw new HttpException("User is already banned.", 400);
  }
  // Collect createInput data
  const baseData = await DiscussionBoardUserBanCollector.collect({
    body: props.body,
  });
  // Prepare create data with administrator relation
  const createData = {
    ...baseData,
    administrator: { connect: { id: props.administrator.id } },
  };
  // Create the ban record
  const created = await MyGlobal.prisma.discussion_board_user_bans.create({
    data: createData,
  });
  // Fetch and transform the created ban record
  const ban =
    await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
      where: { id: created.id },
      ...DiscussionBoardUserBanTransformer.select(),
    });
  return await DiscussionBoardUserBanTransformer.transform(ban);
}
