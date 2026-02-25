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

export async function putDiscussionBoardSuperAdministratorAdministratorBansBanId(props: {
  superAdministrator: SuperadministratorPayload;
  banId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUserBan.IUpdate;
}): Promise<IDiscussionBoardUserBan> {
  await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
    where: { id: props.banId },
    select: { id: true },
  });
  // Convert ISO date strings to Date objects, null treated as undefined (skip update)
  const banned_at =
    props.body.bannedAt === undefined || props.body.bannedAt === null
      ? undefined
      : new Date(props.body.bannedAt);
  const created_at =
    props.body.createdAt === undefined || props.body.createdAt === null
      ? undefined
      : new Date(props.body.createdAt);
  const updated_at =
    props.body.updatedAt === undefined || props.body.updatedAt === null
      ? undefined
      : new Date(props.body.updatedAt);
  const deleted_at =
    props.body.deletedAt === undefined || props.body.deletedAt === null
      ? undefined
      : new Date(props.body.deletedAt);
  const hasAdministratorId = Object.prototype.hasOwnProperty.call(
    props.body,
    "administratorId",
  );
  const administrator_id = hasAdministratorId
    ? props.body.administratorId
    : undefined;
  const updateData: Prisma.discussion_board_user_bansUpdateInput = {
    ...(props.body.reason !== undefined && { reason: props.body.reason }),
    ...(banned_at !== undefined && { banned_at }),
    ...(administrator_id !== undefined && { administrator_id }),
    ...(created_at !== undefined && { created_at }),
    ...(updated_at !== undefined && { updated_at }),
    ...(deleted_at !== undefined && { deleted_at }),
  };
  const updated = await MyGlobal.prisma.discussion_board_user_bans.update({
    where: { id: props.banId },
    data: updateData,
    ...DiscussionBoardUserBanTransformer.select(),
  });
  return await DiscussionBoardUserBanTransformer.transform(updated);
}
