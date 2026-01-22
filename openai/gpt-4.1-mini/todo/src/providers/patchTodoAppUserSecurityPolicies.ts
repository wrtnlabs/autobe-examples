import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppSecurityPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSecurityPolicy";
import { IPageITodoAppSecurityPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSecurityPolicy";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserSecurityPolicies(props: {
  user: UserPayload;
  body: ITodoAppSecurityPolicy.IRequest;
}): Promise<IPageITodoAppSecurityPolicy.ISummary> {
  // Determine pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const skip = (page - 1) * limit;
  // Build where condition for filtering
  const where = {
    deleted_at: null,
    ...(props.body.search
      ? {
          OR: [
            { key: { contains: props.body.search } },
            { value: { contains: props.body.search } },
          ],
        }
      : {}),
  } satisfies Prisma.todo_app_security_policiesWhereInput;
  // Build orderBy condition for sorting
  const orderBy = (
    props.body.sortBy
      ? {
          [props.body.sortBy]: props.body.sortOrder === "asc" ? "asc" : "desc",
        }
      : { created_at: "desc" }
  ) satisfies Prisma.todo_app_security_policiesOrderByWithRelationInput;
  // Query filtered data list
  const dataRaw = await MyGlobal.prisma.todo_app_security_policies.findMany({
    where: where,
    orderBy: orderBy,
    skip: skip,
    take: limit,
  });
  // Query total count for pagination
  const total = await MyGlobal.prisma.todo_app_security_policies.count({
    where: where,
  });
  // Map data to ITodoAppSecurityPolicy.ISummary with correct null/undefined and date conversions
  const data = dataRaw.map((item) => ({
    id: item.id === null ? null : item.id,
    key: item.key,
    value: item.value,
    description: item.description === null ? null : item.description,
    active: item.active,
    createdAt: toISOStringSafe(item.created_at),
    updatedAt: toISOStringSafe(item.updated_at),
  }));
  // Return paginated response
  return {
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
