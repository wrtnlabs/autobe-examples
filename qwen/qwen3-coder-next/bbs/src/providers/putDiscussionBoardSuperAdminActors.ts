import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminActors(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardGuest.IUpdate;
}): Promise<void> {
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  await MyGlobal.prisma.discussion_board_super_admins.update({
    where: {
      id: props.superAdmin.id,
      deleted_at: null,
    },
    data: {
      display_name: props.body.display_name,
      bio: props.body.bio,
      updated_at: now,
    },
  });
}
