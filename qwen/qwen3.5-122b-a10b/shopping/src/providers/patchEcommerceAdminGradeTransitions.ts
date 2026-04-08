import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceAdminGradeTransition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminGradeTransition";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceAdminGradeTransition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminGradeTransition";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceAdminGradeTransitionAtSummaryTransformer } from "../transformers/EcommerceAdminGradeTransitionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminGradeTransitions(props: {
  admin: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "admin";
  };
  body: IEcommerceAdminGradeTransition.IRequest;
}): Promise<IPageIEcommerceAdminGradeTransition.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_admin_grade_transitionsWhereInput = {};
  if (props.body.ecommerce_admin_id !== undefined) {
    whereInput.ecommerce_admin_id = props.body.ecommerce_admin_id;
  }
  if (props.body.performed_by_admin_id !== undefined) {
    whereInput.performed_by_admin_id = props.body.performed_by_admin_id;
  }
  if (props.body.from_grade !== undefined) {
    whereInput.from_grade = props.body.from_grade;
  }
  if (props.body.to_grade !== undefined) {
    whereInput.to_grade = props.body.to_grade;
  }
  if (props.body.changed_at_after !== undefined) {
    if (props.body.changed_at_before !== undefined) {
      whereInput.changed_at = {
        gte: new Date(props.body.changed_at_after),
        lte: new Date(props.body.changed_at_before),
      };
    } else {
      whereInput.changed_at = {
        gte: new Date(props.body.changed_at_after),
      };
    }
  } else if (props.body.changed_at_before !== undefined) {
    whereInput.changed_at = {
      lte: new Date(props.body.changed_at_before),
    };
  }
  const data = await MyGlobal.prisma.ecommerce_admin_grade_transitions.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { changed_at: "desc" as const },
      ...EcommerceAdminGradeTransitionAtSummaryTransformer.select(),
    },
  );
  const total: number =
    await MyGlobal.prisma.ecommerce_admin_grade_transitions.count({
      where: whereInput,
    });
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceAdminGradeTransitionAtSummaryTransformer.transform,
  );
  return {
    pagination: pagination,
    data: transformedData,
  } satisfies IPageIEcommerceAdminGradeTransition.ISummary;
}
