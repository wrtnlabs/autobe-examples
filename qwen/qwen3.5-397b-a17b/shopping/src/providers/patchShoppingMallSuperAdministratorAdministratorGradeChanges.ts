import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorGradeChange";
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
import { ShoppingMallAdministratorGradeChangeAtSummaryTransformer } from "../transformers/ShoppingMallAdministratorGradeChangeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdministratorAdministratorGradeChanges(props: {
  superAdministrator: SuperadministratorPayload;
  body: IShoppingMallAdministratorGradeChange.IRequest;
}): Promise<IPageIShoppingMallAdministratorGradeChange.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_administrator_grade_changesWhereInput =
    {
      ...(props.body.shopping_mall_administrator_id && {
        shopping_mall_administrator_id:
          props.body.shopping_mall_administrator_id,
      }),
      ...(props.body.shopping_mall_super_administrator_id && {
        shopping_mall_super_administrator_id:
          props.body.shopping_mall_super_administrator_id,
      }),
      ...(props.body.previous_grade && {
        previous_grade: props.body.previous_grade,
      }),
      ...(props.body.new_grade && {
        new_grade: props.body.new_grade,
      }),
      ...(props.body.created_at_from || props.body.created_at_to
        ? {
            created_at: {
              ...(props.body.created_at_from && {
                gte: new Date(props.body.created_at_from),
              }),
              ...(props.body.created_at_to && {
                lte: new Date(props.body.created_at_to),
              }),
            },
          }
        : {}),
      ...(props.body.search
        ? {
            OR: [
              {
                administrator: {
                  email: {
                    contains: props.body.search,
                  },
                },
              },
              {
                superAdministrator: {
                  email: {
                    contains: props.body.search,
                  },
                },
              },
            ],
          }
        : {}),
    } satisfies Prisma.shopping_mall_administrator_grade_changesWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_administrator_grade_changes.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallAdministratorGradeChangeAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_administrator_grade_changes.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallAdministratorGradeChangeAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
