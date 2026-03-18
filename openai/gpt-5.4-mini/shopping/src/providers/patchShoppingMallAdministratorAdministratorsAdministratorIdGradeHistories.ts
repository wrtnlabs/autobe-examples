import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministratorGradeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorGradeHistory";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorGradeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeHistory";
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

export async function patchShoppingMallAdministratorAdministratorsAdministratorIdGradeHistories(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IShoppingMallAdministratorGradeHistory.IRequest;
}): Promise<IPageIShoppingMallAdministratorGradeHistory> {
  const actor =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: {
        id: true,
        grade: true,
      },
    });
  if (actor.grade !== "super administrator") {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
    where: { id: props.administratorId },
    select: {
      id: true,
    },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const rows =
    await MyGlobal.prisma.shopping_mall_administrator_grade_histories.findMany({
      where: {
        shopping_mall_administrator_id: props.administratorId,
        ...(props.body.performedByAdministratorId !== null
          ? {
              performed_by_administrator_id:
                props.body.performedByAdministratorId,
            }
          : {}),
        ...(props.body.previousGrade !== null
          ? { previous_grade: props.body.previousGrade }
          : {}),
        ...(props.body.newGrade !== null
          ? { new_grade: props.body.newGrade }
          : {}),
        ...(props.body.reason !== null
          ? { reason: { contains: props.body.reason } }
          : {}),
        ...(props.body.createdAtStart !== null ||
        props.body.createdAtEnd !== null
          ? {
              created_at: {
                ...(props.body.createdAtStart !== null
                  ? { gte: props.body.createdAtStart }
                  : {}),
                ...(props.body.createdAtEnd !== null
                  ? { lte: props.body.createdAtEnd }
                  : {}),
              },
            }
          : {}),
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        shopping_mall_administrator_id: true,
        performed_by_administrator_id: true,
        previous_grade: true,
        new_grade: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        administrator: {
          select: {
            id: true,
            email: true,
            grade: true,
            account_status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        performedByAdministrator: {
          select: {
            id: true,
            email: true,
            grade: true,
            account_status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  const total: number =
    await MyGlobal.prisma.shopping_mall_administrator_grade_histories.count({
      where: {
        shopping_mall_administrator_id: props.administratorId,
        ...(props.body.performedByAdministratorId !== null
          ? {
              performed_by_administrator_id:
                props.body.performedByAdministratorId,
            }
          : {}),
        ...(props.body.previousGrade !== null
          ? { previous_grade: props.body.previousGrade }
          : {}),
        ...(props.body.newGrade !== null
          ? { new_grade: props.body.newGrade }
          : {}),
        ...(props.body.reason !== null
          ? { reason: { contains: props.body.reason } }
          : {}),
        ...(props.body.createdAtStart !== null ||
        props.body.createdAtEnd !== null
          ? {
              created_at: {
                ...(props.body.createdAtStart !== null
                  ? { gte: props.body.createdAtStart }
                  : {}),
                ...(props.body.createdAtEnd !== null
                  ? { lte: props.body.createdAtEnd }
                  : {}),
              },
            }
          : {}),
      },
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      administrator: {
        id: row.administrator.id,
        email: row.administrator.email,
        grade: row.administrator.grade,
        accountStatus: row.administrator.account_status,
        createdAt: row.administrator.created_at.toISOString(),
        updatedAt: row.administrator.updated_at.toISOString(),
        deletedAt:
          row.administrator.deleted_at === null
            ? null
            : row.administrator.deleted_at.toISOString(),
      } satisfies IShoppingMallAdministrator.ISummary,
      performedByAdministrator: {
        id: row.performedByAdministrator.id,
        email: row.performedByAdministrator.email,
        grade: row.performedByAdministrator.grade,
        accountStatus: row.performedByAdministrator.account_status,
        createdAt: row.performedByAdministrator.created_at.toISOString(),
        updatedAt: row.performedByAdministrator.updated_at.toISOString(),
        deletedAt:
          row.performedByAdministrator.deleted_at === null
            ? null
            : row.performedByAdministrator.deleted_at.toISOString(),
      } satisfies IShoppingMallAdministrator.ISummary,
      previousGrade: row.previous_grade,
      newGrade: row.new_grade,
      reason: row.reason,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      deletedAt: row.deleted_at === null ? null : row.deleted_at.toISOString(),
    })),
  };
}
