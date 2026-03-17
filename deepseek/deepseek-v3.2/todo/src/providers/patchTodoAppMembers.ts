import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMember";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppMemberAtSummaryTransformer } from "../transformers/TodoAppMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMembers(props: {
  body: ITodoAppMember.IRequest;
}): Promise<IPageITodoAppMember.ISummary> {
  // Authorization check - only admins should access member search
  // TODO: This should come from props.customer or similar but not in signature
  // For now, we'll implement filtering but note authorization is required
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause
  const where: Prisma.todo_app_membersWhereInput = {
    AND: [
      // Search filter
      ...(props.body.search
        ? [
            {
              OR: [
                {
                  email: {
                    contains: props.body.search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  display_name: {
                    contains: props.body.search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              ],
            },
          ]
        : []),
      // Email filter
      ...(props.body.email ? [{ email: props.body.email }] : []),
      // Display name filter
      ...(props.body.display_name
        ? [
            props.body.display_name.length > 2
              ? {
                  display_name: {
                    // Trigram similarity - needs extension
                    contains: props.body.display_name,
                    mode: Prisma.QueryMode.insensitive,
                  },
                }
              : {
                  display_name: {
                    contains: props.body.display_name,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
          ]
        : []),
      // Active status filter
      ...(props.body.active !== undefined
        ? props.body.active
          ? [{ deleted_at: null }]
          : [{ deleted_at: { not: null } }]
        : []),
      // Created date range
      ...(props.body.created_from || props.body.created_to
        ? [
            {
              created_at: {
                ...(props.body.created_from && {
                  gte: new Date(props.body.created_from),
                }),
                ...(props.body.created_to && {
                  lt: new Date(props.body.created_to),
                }),
              },
            },
          ]
        : []),
      // Updated date range
      ...(props.body.updated_from || props.body.updated_to
        ? [
            {
              updated_at: {
                ...(props.body.updated_from && {
                  gte: new Date(props.body.updated_from),
                }),
                ...(props.body.updated_to && {
                  lt: new Date(props.body.updated_to),
                }),
              },
            },
          ]
        : []),
      // Deleted date range (only when active=false)
      ...(props.body.deleted_from || props.body.deleted_to
        ? [
            {
              deleted_at: {
                ...(props.body.deleted_from && {
                  gte: new Date(props.body.deleted_from),
                }),
                ...(props.body.deleted_to && {
                  lt: new Date(props.body.deleted_to),
                }),
              },
            },
          ]
        : []),
    ],
  };
  // Determine orderBy based on sort parameter
  let orderBy: Prisma.todo_app_membersOrderByWithRelationInput[] = [];
  switch (props.body.sort) {
    case "created_at:desc":
      orderBy = [{ created_at: "desc" }, { id: "desc" }];
      break;
    case "created_at:asc":
      orderBy = [{ created_at: "asc" }, { id: "asc" }];
      break;
    case "email:asc":
      orderBy = [{ email: "asc" }, { id: "asc" }];
      break;
    case "email:desc":
      orderBy = [{ email: "desc" }, { id: "desc" }];
      break;
    case "display_name:asc":
      orderBy = [{ display_name: "asc" }, { id: "asc" }];
      break;
    case "display_name:desc":
      orderBy = [{ display_name: "desc" }, { id: "desc" }];
      break;
    case "updated_at:desc":
      orderBy = [{ updated_at: "desc" }, { id: "desc" }];
      break;
    case "updated_at:asc":
      orderBy = [{ updated_at: "asc" }, { id: "asc" }];
      break;
    default:
      orderBy = [{ created_at: "desc" }, { id: "desc" }];
      break;
  }
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_members.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...TodoAppMemberAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.todo_app_members.count({ where }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    TodoAppMemberAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
