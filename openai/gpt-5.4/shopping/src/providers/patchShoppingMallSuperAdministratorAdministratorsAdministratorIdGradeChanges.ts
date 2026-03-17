import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorGradeChange";
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

export async function patchShoppingMallSuperAdministratorAdministratorsAdministratorIdGradeChanges(props: {
  superAdministrator: SuperadministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IShoppingMallAdministratorGradeChange.IRequest;
}): Promise<IPageIShoppingMallAdministratorGradeChange.ISummary> {
  await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
    where: { id: props.administratorId },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    shopping_mall_administrator_id: props.administratorId,
    ...(props.body.previous_grade !== undefined && {
      previous_grade: props.body.previous_grade,
    }),
    ...(props.body.new_grade !== undefined && {
      new_grade: props.body.new_grade,
    }),
    ...(props.body.shopping_mall_super_administrator_id !== undefined && {
      shopping_mall_super_administrator_id:
        props.body.shopping_mall_super_administrator_id,
    }),
    ...(props.body.reason !== undefined && {
      reason: {
        contains: props.body.reason,
        mode: "insensitive",
      },
    }),
    ...((props.body.created_at_from !== undefined ||
      props.body.created_at_to !== undefined) && {
      created_at: {
        ...(props.body.created_at_from !== undefined && {
          gte: props.body.created_at_from,
        }),
        ...(props.body.created_at_to !== undefined && {
          lte: props.body.created_at_to,
        }),
      },
    }),
  } satisfies Prisma.shopping_mall_administrator_grade_changesWhereInput;
  const orderBy =
    props.body.sort === "created_at_asc"
      ? ([
          { created_at: "asc" },
          { id: "asc" },
        ] satisfies Prisma.shopping_mall_administrator_grade_changesOrderByWithRelationInput[])
      : props.body.sort === "created_at_desc"
        ? ([
            { created_at: "desc" },
            { id: "asc" },
          ] satisfies Prisma.shopping_mall_administrator_grade_changesOrderByWithRelationInput[])
        : props.body.sort === "previous_grade_asc"
          ? ([
              { previous_grade: "asc" },
              { id: "asc" },
            ] satisfies Prisma.shopping_mall_administrator_grade_changesOrderByWithRelationInput[])
          : props.body.sort === "previous_grade_desc"
            ? ([
                { previous_grade: "desc" },
                { id: "asc" },
              ] satisfies Prisma.shopping_mall_administrator_grade_changesOrderByWithRelationInput[])
            : props.body.sort === "new_grade_asc"
              ? ([
                  { new_grade: "asc" },
                  { id: "asc" },
                ] satisfies Prisma.shopping_mall_administrator_grade_changesOrderByWithRelationInput[])
              : props.body.sort === "new_grade_desc"
                ? ([
                    { new_grade: "desc" },
                    { id: "asc" },
                  ] satisfies Prisma.shopping_mall_administrator_grade_changesOrderByWithRelationInput[])
                : ([
                    { created_at: "desc" },
                    { id: "asc" },
                  ] satisfies Prisma.shopping_mall_administrator_grade_changesOrderByWithRelationInput[]);
  const rows =
    await MyGlobal.prisma.shopping_mall_administrator_grade_changes.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...ShoppingMallAdministratorGradeChangeAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_administrator_grade_changes.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      rows,
      ShoppingMallAdministratorGradeChangeAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
