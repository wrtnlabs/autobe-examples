import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { IPageITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminMembers(props: {
  admin: AdminPayload;
  body: ITodoAppMember.IRequest;
}): Promise<IPageITodoAppMember.ISummary> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build dynamic search conditions
  const searchCondition = props.body.search
    ? {
        OR: [
          {
            email: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          {
            first_name: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          {
            last_name: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : {};

  // Build status filter condition
  const statusCondition = props.body.status
    ? { status: props.body.status }
    : {};

  // Build where conditions
  const whereCondition = {
    deleted_at: null, // Exclude soft-deleted members
    ...searchCondition,
    ...statusCondition,
  };

  // Build ordering
  const orderBy = [];
  const orderField = props.body.order_by ?? "created_at";
  const orderDirection = props.body.order_direction ?? "desc";

  if (orderField === "email") {
    orderBy.push({ email: orderDirection });
  } else if (orderField === "first_name") {
    orderBy.push({ first_name: orderDirection });
  } else if (orderField === "last_name") {
    orderBy.push({ last_name: orderDirection });
  } else if (orderField === "created_at") {
    orderBy.push({ created_at: orderDirection });
  } else if (orderField === "updated_at") {
    orderBy.push({ updated_at: orderDirection });
  }

  // Execute concurrent queries for performance
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_members.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_app_members.count({
      where: whereCondition,
    }),
  ]);

  // Map database results to API format
  const mappedData = data.map((member) => ({
    id: member.id as string & tags.Format<"uuid">,
    email: member.email as string & tags.Format<"email">,
    first_name: member.first_name ?? undefined,
    last_name: member.last_name ?? undefined,
    status: member.status,
  }));

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const pagination = {
    current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
    records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
    pages: totalPages as number & tags.Type<"int32"> & tags.Minimum<0>,
  };

  return {
    data: mappedData,
    pagination,
  };
}
