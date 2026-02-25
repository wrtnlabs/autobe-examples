import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardUserSessionTransformer } from "../transformers/DiscussionBoardUserSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserUsersSessionsSessionId(props: {
  user: UserPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserSession> {
  const session =
    await MyGlobal.prisma.discussion_board_user_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      include: {
        user: {
          select: { id: true, display_name: true, created_at: true, bio: true },
        },
      },
    });
  if (session.user.id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await DiscussionBoardUserSessionTransformer.transform({
    ...session,
    user: {
      id: session.user.id,
      display_name: session.user.display_name,
      created_at: session.user.created_at,
      bio: session.user.bio,
    },
  });
}
