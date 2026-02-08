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

export async function getDiscussionBoardSuperAdministratorSuperAdministratorsId(props: {
  superAdministrator: SuperadministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSuperAdministrator> {
  const record =
    await MyGlobal.prisma.discussion_board_super_administrators.findUnique({
      where: { id: props.id },
      select: {
        id: true,
        email: true,
        display_name: true,
        bio: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!record) throw new HttpException("Super Administrator not found", 404);
  return {
    id: record.id,
    email: record.email,
    displayName: record.display_name,
    bio: record.bio === null ? undefined : record.bio,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: toISOStringSafe(record.updated_at),
    deletedAt:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
