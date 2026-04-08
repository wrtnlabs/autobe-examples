import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { IPageIMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoAtSummaryTransformer } from "../transformers/MultiUserTodoTodoAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberTodosSearch(props: {
  member: MemberPayload;
  body: IMultiUserTodo.IRequest;
}): Promise<IPageIMultiUserTodoTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const total = 0;
  const pages = 0;
  return {
    pagination: {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages,
      } satisfies IPage.IPagination,
      data: [],
    } satisfies IPageIMultiUserTodoUserProfile.IPagination,
    data: await ArrayUtil.asyncMap(
      [],
      MultiUserTodoTodoAtSummaryTransformer.transform,
    ),
  } satisfies IPageIMultiUserTodoTodo.ISummary;
}
