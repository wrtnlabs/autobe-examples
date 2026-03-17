import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberSessionAtSummaryTransformer } from "../transformers/TodoAppMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberSessions(props: {
  member: MemberPayload;
  body: ITodoAppMemberSession.IRequest;
}): Promise<IPageITodoAppMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    todo_app_member_id: props.member.id,
    ...(props.body.ip !== undefined && {
      ip: {
        contains: props.body.ip,
      },
    }),
    ...(props.body.href !== undefined && {
      href: {
        contains: props.body.href,
      },
    }),
    ...(props.body.referrer !== undefined && {
      referrer: {
        contains: props.body.referrer,
      },
    }),
    ...(props.body.created_at !== undefined && {
      created_at: props.body.created_at,
    }),
    ...(props.body.expired_at !== undefined && {
      expired_at: props.body.expired_at,
    }),
  } satisfies Prisma.todo_app_member_sessionsWhereInput;
  const orderByInput: Prisma.todo_app_member_sessionsOrderByWithRelationInput[] =
    props.body.sort === "created_at_asc"
      ? [
          { created_at: "asc" satisfies Prisma.SortOrder },
          { id: "asc" satisfies Prisma.SortOrder },
        ]
      : props.body.sort === "created_at_desc"
        ? [
            { created_at: "desc" satisfies Prisma.SortOrder },
            { id: "desc" satisfies Prisma.SortOrder },
          ]
        : props.body.sort === "expired_at_asc"
          ? [
              { expired_at: "asc" satisfies Prisma.SortOrder },
              { id: "asc" satisfies Prisma.SortOrder },
            ]
          : props.body.sort === "expired_at_desc"
            ? [
                { expired_at: "desc" satisfies Prisma.SortOrder },
                { id: "desc" satisfies Prisma.SortOrder },
              ]
            : props.body.sort === "ip_asc"
              ? [
                  { ip: "asc" satisfies Prisma.SortOrder },
                  { id: "asc" satisfies Prisma.SortOrder },
                ]
              : props.body.sort === "ip_desc"
                ? [
                    { ip: "desc" satisfies Prisma.SortOrder },
                    { id: "desc" satisfies Prisma.SortOrder },
                  ]
                : props.body.sort === "href_asc"
                  ? [
                      { href: "asc" satisfies Prisma.SortOrder },
                      { id: "asc" satisfies Prisma.SortOrder },
                    ]
                  : props.body.sort === "href_desc"
                    ? [
                        { href: "desc" satisfies Prisma.SortOrder },
                        { id: "desc" satisfies Prisma.SortOrder },
                      ]
                    : props.body.sort === "referrer_asc"
                      ? [
                          { referrer: "asc" satisfies Prisma.SortOrder },
                          { id: "asc" satisfies Prisma.SortOrder },
                        ]
                      : props.body.sort === "referrer_desc"
                        ? [
                            { referrer: "desc" satisfies Prisma.SortOrder },
                            { id: "desc" satisfies Prisma.SortOrder },
                          ]
                        : [
                            { created_at: "desc" satisfies Prisma.SortOrder },
                            { id: "desc" satisfies Prisma.SortOrder },
                          ];
  const data = await MyGlobal.prisma.todo_app_member_sessions.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...TodoAppMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_member_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppMemberSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
