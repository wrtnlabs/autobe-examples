import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoDataRetentionPolicy";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoDataRetentionPolicy";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoDataRetentionPolicyAtSummaryTransformer } from "../transformers/MultiUserTodoDataRetentionPolicyAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoAdminDataRetentionPolicies(props: {
  admin: AdminPayload;
  body: IMultiUserTodoDataRetentionPolicy.IRequest;
}): Promise<IPageIMultiUserTodoDataRetentionPolicy.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const whereInput = {
    deleted_at: null,
    ...(props.body.policy_name !== undefined && {
      policy_name: { contains: props.body.policy_name },
    }),
    ...(props.body.target_entity_type !== undefined && {
      target_entity_type: props.body.target_entity_type,
    }),
    ...(props.body.enforcement_enabled !== undefined &&
      props.body.enforcement_enabled !== null && {
        enforcement_enabled: props.body.enforcement_enabled,
      }),
    ...(props.body.compliance_required !== undefined &&
      props.body.compliance_required !== null && {
        compliance_required: props.body.compliance_required,
      }),
    ...(props.body.retention_period_days !== undefined &&
      props.body.retention_period_days !== null && {
        retention_period_days: { gte: props.body.retention_period_days },
      }),
  } satisfies Prisma.multi_user_todo_data_retention_policiesWhereInput;
  // Get transformer select with required relations
  const select = MultiUserTodoDataRetentionPolicyAtSummaryTransformer.select();
  const [data, total] = await Promise.all([
    MyGlobal.prisma.multi_user_todo_data_retention_policies.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...select,
    }),
    MyGlobal.prisma.multi_user_todo_data_retention_policies.count({
      where: whereInput,
    }),
  ]);
  // Transform the data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    MultiUserTodoDataRetentionPolicyAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    } satisfies IPage.IPagination,
  };
}
