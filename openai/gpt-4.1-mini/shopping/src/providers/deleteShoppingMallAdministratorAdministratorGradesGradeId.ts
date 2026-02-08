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

export async function deleteShoppingMallAdministratorAdministratorGradesGradeId(props: {
  administrator: AdministratorPayload;
  gradeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify caller is super administrator
  const admin = await MyGlobal.prisma.shopping_mall_administrators.findUnique({
    where: { id: props.administrator.id },
    select: {
      is_super_admin: true,
    },
  });
  if (!admin || !admin.is_super_admin) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify the grade to delete exists
  const grade =
    await MyGlobal.prisma.shopping_mall_administrator_grades.findUnique({
      where: { id: props.gradeId },
    });
  if (!grade) {
    throw new HttpException("Administrator grade not found", 404);
  }
  try {
    await MyGlobal.prisma.shopping_mall_administrator_grades.delete({
      where: { id: props.gradeId },
    });
  } catch (_error: unknown) {
    throw new HttpException(
      "Failed to delete administrator grade due to constraints",
      400,
    );
  }
  // Audit logging can be added here if specified
}
