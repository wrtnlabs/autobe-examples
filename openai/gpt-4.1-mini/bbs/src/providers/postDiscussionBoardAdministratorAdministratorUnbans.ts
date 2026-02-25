import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardUserUnbanCollector } from "../collectors/DiscussionBoardUserUnbanCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardUserUnbanTransformer } from "../transformers/DiscussionBoardUserUnbanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorAdministratorUnbans(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardUserUnban.ICreate;
}): Promise<IDiscussionBoardUserUnban> {
  // Check ban existence
  await MyGlobal.prisma.discussion_board_user_bans.findFirstOrThrow({
    where: {
      id: props.body.userBanId,
      deleted_at: null,
    },
  });
  // Create the unban record
  const created = await MyGlobal.prisma.discussion_board_user_unbans.create({
    data: await DiscussionBoardUserUnbanCollector.collect({ body: props.body }),
    ...DiscussionBoardUserUnbanTransformer.select(),
  });
  // Transform and return the result
  return await DiscussionBoardUserUnbanTransformer.transform(created);
}
