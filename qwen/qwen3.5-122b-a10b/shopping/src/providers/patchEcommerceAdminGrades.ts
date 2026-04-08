import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdministratorGrade";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceAdministratorGradeAtSummaryTransformer } from "../transformers/EcommerceAdministratorGradeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminGrades(props: {
  admin: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "admin";
  };
  body: IEcommerceAdministratorGrade.IRequest;
}): Promise<IPageIEcommerceAdministratorGrade.ISummary> {
  const page = props.body.page ?? 1;
  const limit =
    props.body.limit === undefined
      ? 10
      : Math.max(1, Math.min(props.body.limit, 100));
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_administrator_gradesWhereInput = {
    deleted_at: null,
    ...(props.body.grade !== undefined && {
      grade: props.body.grade,
    }),
    ...(props.body.adminEmail !== undefined && {
      ecommerceAdmin: {
        email: {
          contains: props.body.adminEmail,
          mode: "insensitive",
        },
      },
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: {
        gte: new Date(props.body.createdAtFrom),
      },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: {
        lte: new Date(props.body.createdAtTo),
      },
    }),
    ...(props.body.updatedAtFrom !== undefined && {
      updated_at: {
        gte: new Date(props.body.updatedAtFrom),
      },
    }),
    ...(props.body.updatedAtTo !== undefined && {
      updated_at: {
        lte: new Date(props.body.updatedAtTo),
      },
    }),
  } satisfies Prisma.ecommerce_administrator_gradesWhereInput;
  const orderByInput: Prisma.ecommerce_administrator_gradesOrderByWithRelationInput =
    {
      created_at: "desc",
    } satisfies Prisma.ecommerce_administrator_gradesOrderByWithRelationInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_administrator_grades.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip: skip,
      take: limit,
      ...EcommerceAdministratorGradeAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_administrator_grades.count({
      where: whereInput,
    }),
  ]);
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceAdministratorGradeAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceAdministratorGrade.ISummary;
}
