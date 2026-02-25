import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardSuperAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSuperAdminPasswordResetTransformer } from "../transformers/DiscussionBoardSuperAdminPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminSuperAdminsPasswordResetsResetId(props: {
  superAdmin: SuperAdminPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSuperAdminPasswordReset> {
  const resetRecord =
    await MyGlobal.prisma.discussion_board_super_admin_password_resets.findUniqueOrThrow(
      {
        where: { id: props.resetId },
        ...DiscussionBoardSuperAdminPasswordResetTransformer.select(),
      },
    );
  return await DiscussionBoardSuperAdminPasswordResetTransformer.transform(
    resetRecord,
  );
}
