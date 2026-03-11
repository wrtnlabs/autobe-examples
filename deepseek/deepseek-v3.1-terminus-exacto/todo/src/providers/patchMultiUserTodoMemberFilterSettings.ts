import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoFilterSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSetting";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoTodoFilterSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoFilterSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoFilterSettingAtSummaryTransformer } from "../transformers/MultiUserTodoTodoFilterSettingAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberFilterSettings(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodoFilterSetting.IRequest;
}): Promise<IPageIMultiUserTodoTodoFilterSetting.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build comprehensive where clause with member isolation
  const whereInput = {
    multi_user_todo_member_id: props.member.id,
    deleted_at: null,
    ...(props.body.search &&
      props.body.search.trim() !== "" && {
        name: {
          contains: props.body.search.trim(),
          mode: "insensitive" as const,
        },
      }),
    ...(props.body.filter_type !== undefined && {
      filter_type: props.body.filter_type,
    }),
    ...(props.body.is_default !== undefined && {
      is_default: props.body.is_default,
    }),
  } satisfies Prisma.multi_user_todo_todo_filter_settingsWhereInput;
  // Fetch paginated data with consistent ordering
  const data =
    await MyGlobal.prisma.multi_user_todo_todo_filter_settings.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: [
        { is_default: "desc" as const },
        { created_at: "desc" as const },
      ],
      ...MultiUserTodoTodoFilterSettingAtSummaryTransformer.select(),
    });
  // Count total matching records for pagination metadata
  const total =
    await MyGlobal.prisma.multi_user_todo_todo_filter_settings.count({
      where: whereInput,
    });
  // Transform database records to DTO format using available transformer
  const transformed = await ArrayUtil.asyncMap(
    data,
    MultiUserTodoTodoFilterSettingAtSummaryTransformer.transform,
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
