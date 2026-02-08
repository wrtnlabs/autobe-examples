import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoUserSessions(props: {
  user: UserPayload;
  body: IMultiUserTodoUserSession.IRequest;
}): Promise<IPageIMultiUserTodoUserSession.ISummary> {
  if (!props.user?.id) {
    throw new HttpException("Unauthorized", 401);
  }
  const pageRaw = (props.body as any).page;
  const limitRaw = (props.body as any).limit;
  const page = typeof pageRaw === "number" && pageRaw > 0 ? pageRaw : 1;
  const limit = typeof limitRaw === "number" && limitRaw > 0 ? limitRaw : 100;
  const skip = (page - 1) * limit;
  const where = {
    multi_user_todo_user_id: props.user.id,
    deleted_at: null,
  } as const;
  const dataRecords =
    await MyGlobal.prisma.multi_user_todo_user_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: { id: true },
    });
  const total = await MyGlobal.prisma.multi_user_todo_user_sessions.count({
    where,
  });
  const data = dataRecords.map(() => ({}));
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
