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

export async function deleteDiscussionBoardSuperAdministratorSystemSettingsId(props: {
  superAdministrator: SuperadministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.discussion_board_system_settings.findUnique({
      where: { id: props.id },
    });
  if (!existing) throw new HttpException("System setting not found", 404);
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discussion_board_system_settings.delete({
      where: { id: props.id },
    });
  });
}
