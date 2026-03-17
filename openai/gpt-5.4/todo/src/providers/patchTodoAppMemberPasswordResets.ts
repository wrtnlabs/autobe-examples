import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberPasswordReset";
import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberPasswordResetAtSummaryTransformer } from "../transformers/TodoAppMemberPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberPasswordResets(props: {
  member: MemberPayload;
  body: ITodoAppMemberPasswordReset.IRequest;
}): Promise<IPageITodoAppMemberPasswordReset.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  if (
    props.body.sort !== undefined &&
    props.body.sort !== "token_asc" &&
    props.body.sort !== "token_desc" &&
    props.body.sort !== "used_at_asc" &&
    props.body.sort !== "used_at_desc" &&
    props.body.sort !== "expired_at_asc" &&
    props.body.sort !== "expired_at_desc" &&
    props.body.sort !== "created_at_asc" &&
    props.body.sort !== "created_at_desc" &&
    props.body.sort !== "updated_at_asc" &&
    props.body.sort !== "updated_at_desc" &&
    props.body.sort !== "deleted_at_asc" &&
    props.body.sort !== "deleted_at_desc"
  ) {
    throw new HttpException("Invalid sort", 400);
  }
  if (props.body.expired_at === null) {
    throw new HttpException("expired_at cannot be null", 400);
  }
  if (props.body.created_at === null) {
    throw new HttpException("created_at cannot be null", 400);
  }
  if (props.body.updated_at === null) {
    throw new HttpException("updated_at cannot be null", 400);
  }
  const where = {
    todo_app_member_id: props.member.id,
    ...(props.body.token !== undefined && {
      token: props.body.token,
    }),
    ...(props.body.used_at !== undefined && {
      used_at:
        props.body.used_at === null ? null : new Date(props.body.used_at),
    }),
    ...(props.body.expired_at !== undefined && {
      expired_at: new Date(props.body.expired_at),
    }),
    ...(props.body.created_at !== undefined && {
      created_at: new Date(props.body.created_at),
    }),
    ...(props.body.updated_at !== undefined && {
      updated_at: new Date(props.body.updated_at),
    }),
    ...(props.body.deleted_at !== undefined && {
      deleted_at:
        props.body.deleted_at === null ? null : new Date(props.body.deleted_at),
    }),
  } satisfies Prisma.todo_app_member_password_resetsWhereInput;
  const orderBy =
    props.body.sort === "token_asc"
      ? ({
          token: "asc",
        } satisfies Prisma.todo_app_member_password_resetsOrderByWithRelationInput)
      : props.body.sort === "token_desc"
        ? ({
            token: "desc",
          } satisfies Prisma.todo_app_member_password_resetsOrderByWithRelationInput)
        : props.body.sort === "used_at_asc"
          ? ({
              used_at: "asc",
            } satisfies Prisma.todo_app_member_password_resetsOrderByWithRelationInput)
          : props.body.sort === "used_at_desc"
            ? ({
                used_at: "desc",
              } satisfies Prisma.todo_app_member_password_resetsOrderByWithRelationInput)
            : props.body.sort === "expired_at_asc"
              ? ({
                  expired_at: "asc",
                } satisfies Prisma.todo_app_member_password_resetsOrderByWithRelationInput)
              : props.body.sort === "expired_at_desc"
                ? ({
                    expired_at: "desc",
                  } satisfies Prisma.todo_app_member_password_resetsOrderByWithRelationInput)
                : props.body.sort === "created_at_asc"
                  ? ({
                      created_at: "asc",
                    } satisfies Prisma.todo_app_member_password_resetsOrderByWithRelationInput)
                  : props.body.sort === "created_at_desc"
                    ? ({
                        created_at: "desc",
                      } satisfies Prisma.todo_app_member_password_resetsOrderByWithRelationInput)
                    : props.body.sort === "updated_at_asc"
                      ? ({
                          updated_at: "asc",
                        } satisfies Prisma.todo_app_member_password_resetsOrderByWithRelationInput)
                      : props.body.sort === "updated_at_desc"
                        ? ({
                            updated_at: "desc",
                          } satisfies Prisma.todo_app_member_password_resetsOrderByWithRelationInput)
                        : props.body.sort === "deleted_at_asc"
                          ? ({
                              deleted_at: "asc",
                            } satisfies Prisma.todo_app_member_password_resetsOrderByWithRelationInput)
                          : props.body.sort === "deleted_at_desc"
                            ? ({
                                deleted_at: "desc",
                              } satisfies Prisma.todo_app_member_password_resetsOrderByWithRelationInput)
                            : ({
                                created_at: "desc",
                              } satisfies Prisma.todo_app_member_password_resetsOrderByWithRelationInput);
  const data = await MyGlobal.prisma.todo_app_member_password_resets.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...TodoAppMemberPasswordResetAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_member_password_resets.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppMemberPasswordResetAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
