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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { DiscussionBoardUserUnbanTransformer } from "../transformers/DiscussionBoardUserUnbanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdministratorAdministratorUnbans(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardUserUnban.ICreate;
}): Promise<IDiscussionBoardUserUnban> {
  // Authorization guaranteed by superAdministrator in props
  // Verify the referenced user ban exists and is active
  const ban = await MyGlobal.prisma.discussion_board_user_bans.findUnique({
    where: { id: props.body.userBanId },
    select: { id: true, deleted_at: true },
  });
  if (!ban || ban.deleted_at !== null) {
    throw new HttpException(
      "Active ban record not found for given userBanId",
      400,
    );
  }
  // Create the unban record using the collector
  const data = await DiscussionBoardUserUnbanCollector.collect({
    body: props.body,
  });
  const created = await MyGlobal.prisma.discussion_board_user_unbans.create({
    data,
  });
  // Fetch created record with selection for transformation
  const record =
    await MyGlobal.prisma.discussion_board_user_unbans.findUniqueOrThrow({
      where: { id: created.id },
      ...DiscussionBoardUserUnbanTransformer.select(),
    });
  // Transform DB record to API DTO
  return await DiscussionBoardUserUnbanTransformer.transform(record);
}
