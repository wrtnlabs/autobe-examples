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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardUserBanTransformer } from "../transformers/DiscussionBoardUserBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdministratorAdministratorBansBanId(props: {
  administrator: AdministratorPayload;
  banId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUserBan.IUpdate;
}): Promise<IDiscussionBoardUserBan> {
  await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
    where: { id: props.banId },
  });
  const updated = await MyGlobal.prisma.discussion_board_user_bans.update({
    where: { id: props.banId },
    data: {
      ...(props.body.reason !== undefined && { reason: props.body.reason }),
      ...(props.body.bannedAt !== undefined && {
        banned_at: new Date(props.body.bannedAt),
      }),
      ...(props.body.administratorId !== undefined && {
        administrator_id: props.body.administratorId,
      }),
      ...(props.body.createdAt !== null &&
        props.body.createdAt !== undefined && {
          created_at: new Date(props.body.createdAt),
        }),
      ...(props.body.updatedAt !== null &&
        props.body.updatedAt !== undefined && {
          updated_at: new Date(props.body.updatedAt),
        }),
      ...(props.body.deletedAt !== undefined && {
        deleted_at: props.body.deletedAt
          ? new Date(props.body.deletedAt)
          : null,
      }),
    },
    select: DiscussionBoardUserBanTransformer.select().select,
  });
  return await DiscussionBoardUserBanTransformer.transform(updated);
}
