import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoMemberAtSummaryTransformer } from "../transformers/MultiUserTodoMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberPasswordResets(props: {
  body: IMultiUserTodoMemberPasswordReset.IRequest;
}): Promise<IPageIMultiUserTodoMemberPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const whereInput: Prisma.multi_user_todo_member_password_resetsWhereInput = {
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        token: {
          contains: props.body.search,
        },
      }),
    ...(props.body.member_id !== undefined && {
      member_id: props.body.member_id,
    }),
    ...(props.body.status === "valid" && {
      expired_at: {
        gt: now,
      },
    }),
    ...(props.body.status === "expired" && {
      expired_at: {
        lte: now,
      },
    }),
    ...(props.body.created_at_range !== undefined && {
      created_at: {
        gte: props.body.created_at_range.gte,
        lte: props.body.created_at_range.lte,
      },
    }),
    ...(props.body.expired_at_range !== undefined && {
      expired_at: {
        gte: props.body.expired_at_range.gte,
        lte: props.body.expired_at_range.lte,
      },
    }),
  } satisfies Prisma.multi_user_todo_member_password_resetsWhereInput;
  const sortOrder: "asc" | "desc" = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.multi_user_todo_member_password_resetsOrderByWithRelationInput =
    props.body.sortBy === "expired_at"
      ? { expired_at: sortOrder }
      : { created_at: sortOrder };
  const records =
    await MyGlobal.prisma.multi_user_todo_member_password_resets.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: {
        id: true,
        member: MultiUserTodoMemberAtSummaryTransformer.select(),
        expired_at: true,
        created_at: true,
        updated_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.multi_user_todo_member_password_resets.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      async (record) =>
        ({
          id: record.id,
          member: await MultiUserTodoMemberAtSummaryTransformer.transform(
            record.member,
          ),
          expired_at: toISOStringSafe(record.expired_at),
          created_at: toISOStringSafe(record.created_at),
          updated_at: toISOStringSafe(record.updated_at),
        }) satisfies IMultiUserTodoMemberPasswordReset.ISummary,
    ),
  } satisfies IPageIMultiUserTodoMemberPasswordReset.ISummary;
}
