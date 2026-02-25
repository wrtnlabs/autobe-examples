import { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { DiscussionBoardRegisteredUserSessionTransformer } from "../transformers/DiscussionBoardRegisteredUserSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardRegisteredUserSession> {
  const session =
    await MyGlobal.prisma.discussion_board_registered_user_sessions.findUniqueOrThrow(
      {
        where: { id: props.sessionId },
        ...DiscussionBoardRegisteredUserSessionTransformer.select(),
      },
    );
  return await DiscussionBoardRegisteredUserSessionTransformer.transform(
    session,
  );
}
