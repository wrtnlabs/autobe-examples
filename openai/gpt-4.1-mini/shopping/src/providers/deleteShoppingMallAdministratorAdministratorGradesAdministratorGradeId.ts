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

export async function deleteShoppingMallAdministratorAdministratorGradesAdministratorGradeId(props: {
  administrator: AdministratorPayload;
  administratorGradeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if the administrator is a super administrator
  const adminRecord =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: { is_super_admin: true },
    });
  if (!adminRecord.is_super_admin) {
    throw new HttpException("Forbidden", 403);
  }
  // Confirm the administrator grade exists to ensure 404 if not found
  await MyGlobal.prisma.shopping_mall_administrator_grades.findUniqueOrThrow({
    where: { id: props.administratorGradeId },
  });
  // Delete the administrator grade (cascading deletes are not performed automatically)
  await MyGlobal.prisma.shopping_mall_administrator_grades.delete({
    where: { id: props.administratorGradeId },
  });
}
