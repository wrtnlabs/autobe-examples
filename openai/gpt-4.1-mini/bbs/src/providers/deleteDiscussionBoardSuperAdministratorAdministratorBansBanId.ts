import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdministratorAdministratorBansBanId(props: {
  superAdministrator: SuperadministratorPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check existence
  await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
    where: { id: props.banId },
  });
  // Permanently delete the ban record
  await MyGlobal.prisma.discussion_board_user_bans.delete({
    where: { id: props.banId },
  });
}
