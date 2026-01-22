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
import { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { TodoAppGuestSessionCollector } from "../collectors/TodoAppGuestSessionCollector";
import { TodoAppGuestSessionTransformer } from "../transformers/TodoAppGuestSessionTransformer";

export async function postTodoAppGuestsGuestIdSessions(props: {
  guestId: string & tags.Format<"uuid">;
  body: ITodoAppGuestSession.ICreate;
}): Promise<ITodoAppGuestSession> {
  // Use the collector to prepare create input
  const data = await TodoAppGuestSessionCollector.collect({
    body: props.body,
    todoAppGuest: { id: props.guestId },
    ip: props.body.ip ?? "",
  });
  // Create the session record in the database
  const created = await MyGlobal.prisma.todo_app_guest_sessions.create({
    data,
    ...TodoAppGuestSessionTransformer.select(),
  });
  // Transform the database record into API DTO
  return await TodoAppGuestSessionTransformer.transform(created);
}
