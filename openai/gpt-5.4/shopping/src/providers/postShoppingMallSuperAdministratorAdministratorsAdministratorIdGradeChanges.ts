import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ShoppingMallAdministratorGradeChangeTransformer } from "../transformers/ShoppingMallAdministratorGradeChangeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSuperAdministratorAdministratorsAdministratorIdGradeChanges(props: {
  superAdministrator: SuperadministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IShoppingMallAdministratorGradeChange.ICreate;
}): Promise<IShoppingMallAdministratorGradeChange> {
  const acting =
    await MyGlobal.prisma.shopping_mall_super_administrators.findUniqueOrThrow({
      where: { id: props.superAdministrator.id },
      select: {
        id: true,
        active: true,
        deleted_at: true,
      },
    });
  if (acting.active === false || acting.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const target =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administratorId },
      select: {
        id: true,
        banned: true,
        deleted_at: true,
      },
    });
  if (target.deleted_at !== null) {
    throw new HttpException("Administrator account is deleted", 409);
  }
  if (target.banned === true) {
    throw new HttpException(
      "Administrator account is not eligible for promotion",
      409,
    );
  }
  if (target.id === acting.id) {
    throw new HttpException("Administrator is not eligible for promotion", 409);
  }
  const targetSuperAdministrator =
    await MyGlobal.prisma.shopping_mall_super_administrators.findUnique({
      where: { id: props.administratorId },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (
    targetSuperAdministrator !== null &&
    targetSuperAdministrator.deleted_at === null
  ) {
    throw new HttpException(
      "Administrator is already a super administrator",
      409,
    );
  }
  const gradeChangeId: string & tags.Format<"uuid"> = v4();
  const createdAt: string & tags.Format<"date-time"> =
    new globalThis.Date().toISOString();
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_administrator_grade_changes.create({
      data: {
        id: gradeChangeId,
        previous_grade: "administrator",
        new_grade: "superAdministrator",
        reason: props.body.reason ?? null,
        created_at: createdAt,
        administrator: {
          connect: { id: target.id },
        },
        superAdministrator: {
          connect: { id: acting.id },
        },
      },
    });
    return await tx.shopping_mall_administrator_grade_changes.findUniqueOrThrow(
      {
        where: { id: gradeChangeId },
        ...ShoppingMallAdministratorGradeChangeTransformer.select(),
      },
    );
  });
  return await ShoppingMallAdministratorGradeChangeTransformer.transform(
    created,
  );
}
