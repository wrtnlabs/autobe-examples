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

export async function deleteDiscussionBoardSuperAdminActorsActorId(props: {
  superAdmin: SuperadminPayload;
  actorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Delete the super admin account and cascade to related records
  await MyGlobal.prisma.discussion_board_super_admins.delete({
    where: { id: props.actorId },
  });
}
