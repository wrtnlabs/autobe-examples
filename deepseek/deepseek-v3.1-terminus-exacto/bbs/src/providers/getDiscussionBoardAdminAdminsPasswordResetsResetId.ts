import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdminPasswordResetTransformer } from "../transformers/DiscussionBoardAdminPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminAdminsPasswordResetsResetId(props: {
  admin: AdminPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdminPasswordReset> {
  const resetRecord =
    await MyGlobal.prisma.discussion_board_admin_password_resets.findUniqueOrThrow(
      {
        where: { id: props.resetId },
        ...DiscussionBoardAdminPasswordResetTransformer.select(),
      },
    );
  return await DiscussionBoardAdminPasswordResetTransformer.transform(
    resetRecord,
  );
}
