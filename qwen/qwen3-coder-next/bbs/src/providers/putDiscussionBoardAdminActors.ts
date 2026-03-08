import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminActors(props: {
  admin: AdminPayload;
  body: IDiscussionBoardGuest.IUpdate;
}): Promise<void> {
  const { admin, body } = props;
  await MyGlobal.prisma.discussion_board_admins.update({
    where: {
      id: admin.id,
    },
    data: {
      display_name: body.display_name,
      bio: body.bio ?? null,
    },
  });
}
