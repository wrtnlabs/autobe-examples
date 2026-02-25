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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { DiscussionBoardUserUnbanTransformer } from "../transformers/DiscussionBoardUserUnbanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdministratorAdministratorUnbansUnbanId(props: {
  superAdministrator: SuperadministratorPayload;
  unbanId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUserUnban.IUpdate;
}): Promise<IDiscussionBoardUserUnban> {
  await MyGlobal.prisma.discussion_board_user_unbans.findUniqueOrThrow({
    where: { id: props.unbanId },
  });
  await MyGlobal.prisma.discussion_board_user_unbans.update({
    where: { id: props.unbanId },
    data: {
      ...(props.body.reason !== undefined && { reason: props.body.reason }),
      updated_at: new Date().toISOString() as string &
        import("typia").tags.Format<"date-time">,
    },
  });
  const updated =
    await MyGlobal.prisma.discussion_board_user_unbans.findUniqueOrThrow({
      where: { id: props.unbanId },
      ...DiscussionBoardUserUnbanTransformer.select(),
    });
  return await DiscussionBoardUserUnbanTransformer.transform(updated);
}
