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

export async function postDiscussionBoardAdministratorAdministratorBanRegisteredUserId(props: {
  administrator: AdministratorPayload;
  registeredUserId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUserBan.ICreate;
}): Promise<IDiscussionBoardUserBan> {
  // Verify the registered user exists
  await MyGlobal.prisma.discussion_board_registered_users.findUniqueOrThrow({
    where: { id: props.registeredUserId },
    select: { id: true },
  });
  // Generate current timestamp string
  const now: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  // Prepare create input with collector (excluding timestamps to keep immutability)
  const baseCreateInput = await DiscussionBoardUserBanCollector.collect({
    body: props.body,
  });
  // Prepare data for creation
  const createInput = {
    ...baseCreateInput,
    registeredUser: { connect: { id: props.registeredUserId } },
    administrator: { connect: { id: props.administrator.id } },
    banned_at: now,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  } satisfies Prisma.discussion_board_user_bansCreateInput;
  // Create ban record
  const banRecord = await MyGlobal.prisma.discussion_board_user_bans.create({
    data: createInput,
    ...DiscussionBoardUserBanTransformer.select(),
  });
  // Transform and return
  return await DiscussionBoardUserBanTransformer.transform(banRecord);
}
