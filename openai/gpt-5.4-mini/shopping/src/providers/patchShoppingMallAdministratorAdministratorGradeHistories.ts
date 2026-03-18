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

export async function patchShoppingMallAdministratorAdministratorGradeHistories(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministratorGradeHistory.IRequest;
}): Promise<IPageIShoppingMallAdministratorGradeHistory.ISummary> {
  const currentAdministrator =
    await MyGlobal.prisma.shopping_mall_administrators.findFirstOrThrow({
      where: {
        id: props.administrator.id,
        deleted_at: null,
      },
      select: {
        id: true,
        grade: true,
      },
    });
  if (currentAdministrator.grade !== "super administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const where = {
    ...(props.body.shoppingMallAdministratorId !== null && {
      shopping_mall_administrator_id: props.body.shoppingMallAdministratorId,
    }),
    ...(props.body.performedByAdministratorId !== null && {
      performed_by_administrator_id: props.body.performedByAdministratorId,
    }),
    ...(props.body.previousGrade !== null && {
      previous_grade: props.body.previousGrade,
    }),
    ...(props.body.newGrade !== null && {
      new_grade: props.body.newGrade,
    }),
    ...(props.body.reason !== null && {
      reason: {
        contains: props.body.reason,
      },
    }),
    ...(props.body.createdAtStart !== null || props.body.createdAtEnd !== null
      ? {
          created_at: {
            ...(props.body.createdAtStart !== null && {
              gte: props.body.createdAtStart,
            }),
            ...(props.body.createdAtEnd !== null && {
              lte: props.body.createdAtEnd,
            }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_administrator_grade_historiesWhereInput;
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.shopping_mall_administrator_grade_histories.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { created_at: props.body.sort === "createdAtAsc" ? "asc" : "desc" },
        { id: props.body.sort === "createdAtAsc" ? "asc" : "desc" },
      ],
      select: {
        id: true,
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
        previous_grade: true,
        new_grade: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const records =
    await MyGlobal.prisma.shopping_mall_administrator_grade_histories.count({
      where,
    });
  const pagination = {
    current: page,
    limit: limit,
    records: records,
    pages: Math.ceil(records / limit),
  } satisfies IPage.IPagination;
  return {
    data: data.map(
      (item) =>
        ({
          id: item.id,
          administrator: {
            id: item.administrator.id,
            email: item.administrator.email,
            grade: item.administrator.grade,
            accountStatus: item.administrator.account_status,
            createdAt: toISOStringSafe(item.administrator.created_at),
            updatedAt: toISOStringSafe(item.administrator.updated_at),
            deletedAt:
              item.administrator.deleted_at === null
                ? null
                : toISOStringSafe(item.administrator.deleted_at),
          } satisfies IShoppingMallAdministrator.ISummary,
          performedByAdministrator: {
            id: item.performedByAdministrator.id,
            email: item.performedByAdministrator.email,
            grade: item.performedByAdministrator.grade,
            accountStatus: item.performedByAdministrator.account_status,
            createdAt: toISOStringSafe(
              item.performedByAdministrator.created_at,
            ),
            updatedAt: toISOStringSafe(
              item.performedByAdministrator.updated_at,
            ),
            deletedAt:
              item.performedByAdministrator.deleted_at === null
                ? null
                : toISOStringSafe(item.performedByAdministrator.deleted_at),
          } satisfies IShoppingMallAdministrator.ISummary,
          previousGrade: item.previous_grade,
          newGrade: item.new_grade,
          reason: item.reason,
          createdAt: toISOStringSafe(item.created_at),
          updatedAt: toISOStringSafe(item.updated_at),
          deletedAt:
            item.deleted_at === null ? null : toISOStringSafe(item.deleted_at),
        }) satisfies IShoppingMallAdministratorGradeHistory.ISummary,
    ),
    pagination,
  };
}
