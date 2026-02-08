import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorAdministratorsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministrator> {
  const administrator =
    await MyGlobal.prisma.discussion_board_administrators.findUnique({
      where: { id: props.id },
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        grade: {
          select: {
            id: true,
            name: true,
            description: true,
            level: true,
          },
        },
      },
    });
  if (administrator === null) {
    throw new HttpException("Administrator not found", 404);
  }
  return {
    id: administrator.id,
    email: administrator.email,
    password_hash: administrator.password_hash,
    created_at: administrator.created_at,
    updated_at: administrator.updated_at,
    deleted_at: administrator.deleted_at,
    grade:
      administrator.grade === null
        ? null
        : {
            id: administrator.grade.id,
            name: administrator.grade.name,
            description: administrator.grade.description,
            level: administrator.grade.level,
          },
  };
}
