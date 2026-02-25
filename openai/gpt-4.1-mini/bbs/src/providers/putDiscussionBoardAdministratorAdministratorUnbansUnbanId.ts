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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardUserUnbanTransformer } from "../transformers/DiscussionBoardUserUnbanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdministratorAdministratorUnbansUnbanId(props: {
  administrator: AdministratorPayload;
  unbanId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUserUnban.IUpdate;
}): Promise<IDiscussionBoardUserUnban> {
  const updatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const updated = await MyGlobal.prisma.discussion_board_user_unbans.update({
    where: { id: props.unbanId },
    data: {
      ...(props.body.reason !== undefined && { reason: props.body.reason }),
      updated_at: updatedAt,
    },
    ...DiscussionBoardUserUnbanTransformer.select(),
  });
  return await DiscussionBoardUserUnbanTransformer.transform(updated);
}
