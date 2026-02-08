import { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
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

export async function patchDiscussionBoardSuperAdministratorSuperAdministratorsId(props: {
  superAdministrator: SuperadministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardSuperAdministrator.IUpdate;
}): Promise<IDiscussionBoardSuperAdministrator> {
  const existing =
    await MyGlobal.prisma.discussion_board_super_administrators.findFirst({
      where: { id: props.id, deleted_at: null },
    });
  if (!existing) {
    throw new HttpException("Super Administrator not found", 404);
  }
  const updated =
    await MyGlobal.prisma.discussion_board_super_administrators.update({
      where: { id: props.id },
      data: {},
    });
  return updated;
}
