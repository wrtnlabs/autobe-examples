import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoSystemConfiguration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoSystemConfigurationAtSummaryTransformer } from "../transformers/MultiUserTodoSystemConfigurationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoAdminSystemConfigurations(props: {
  admin: AdminPayload;
  body: IMultiUserTodoSystemConfiguration.IRequest;
}): Promise<IPageIMultiUserTodoSystemConfiguration.ISummary> {
  // Pagination setup
  const page = props.body.page ?? 1;
  const rawLimit = props.body.limit ?? 100;
  const limit = Math.max(1, Math.min(rawLimit, 100)); // Enforce 1-100 bounds
  const skip = (page - 1) * limit;
  // Build WHERE clause with filtering
  const whereInput = {
    deleted_at: null, // Exclude soft-deleted records
    ...(props.body.config_key && { config_key: props.body.config_key }),
    ...(props.body.scope && { scope: props.body.scope }),
    ...(props.body.data_type && { data_type: props.body.data_type }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.search && {
      OR: [
        { config_key: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.multi_user_todo_system_configurationsWhereInput;
  // Fetch paginated data
  const data =
    await MyGlobal.prisma.multi_user_todo_system_configurations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...MultiUserTodoSystemConfigurationAtSummaryTransformer.select(),
    });
  // Total count for pagination
  const total =
    await MyGlobal.prisma.multi_user_todo_system_configurations.count({
      where: whereInput,
    });
  // Transform data using transformer
  const transformed = await ArrayUtil.asyncMap(
    data,
    MultiUserTodoSystemConfigurationAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
