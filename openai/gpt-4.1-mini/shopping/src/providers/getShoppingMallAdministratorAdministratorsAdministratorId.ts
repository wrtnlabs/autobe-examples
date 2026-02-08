import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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

export async function getShoppingMallAdministratorAdministratorsAdministratorId(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministrator> {
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.findUnique({
      where: { id: props.administratorId },
      select: {
        id: true,
        administratorGrade: {
          select: {
            id: true,
            name: true,
            grade: true,
            super_administrator: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        email: true,
        name: true,
        is_super_admin: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (administrator === null) {
    throw new HttpException("Administrator not found", 404);
  }
  return {
    id: administrator.id,
    administratorGrade: {
      id: administrator.administratorGrade.id,
      name: administrator.administratorGrade.name,
      grade: administrator.administratorGrade.grade,
      super_administrator: administrator.administratorGrade.super_administrator,
      created_at: toISOStringSafe(administrator.administratorGrade.created_at),
      updated_at: toISOStringSafe(administrator.administratorGrade.updated_at),
      deleted_at:
        administrator.administratorGrade.deleted_at === null
          ? null
          : toISOStringSafe(administrator.administratorGrade.deleted_at),
    },
    email: administrator.email,
    name: administrator.name,
    is_super_admin: administrator.is_super_admin,
    created_at: toISOStringSafe(administrator.created_at),
    updated_at: toISOStringSafe(administrator.updated_at),
    deleted_at:
      administrator.deleted_at === null
        ? null
        : toISOStringSafe(administrator.deleted_at),
  };
}
