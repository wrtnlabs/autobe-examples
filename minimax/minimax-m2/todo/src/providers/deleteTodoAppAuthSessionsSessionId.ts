import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteTodoAppAuthSessionsSessionId(props: {
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if session exists in member sessions table
  const memberSession =
    await MyGlobal.prisma.todo_app_member_sessions.findUnique({
      where: { id: props.sessionId },
    });

  if (memberSession) {
    // Delete member session
    await MyGlobal.prisma.todo_app_member_sessions.delete({
      where: { id: props.sessionId },
    });
    return;
  }

  // Check if session exists in administrator sessions table
  const adminSession =
    await MyGlobal.prisma.todo_app_administrator_sessions.findUnique({
      where: { id: props.sessionId },
    });

  if (adminSession) {
    // Delete administrator session
    await MyGlobal.prisma.todo_app_administrator_sessions.delete({
      where: { id: props.sessionId },
    });
    return;
  }

  // Session not found in either table
  throw new HttpException("Session not found", 404);
}
