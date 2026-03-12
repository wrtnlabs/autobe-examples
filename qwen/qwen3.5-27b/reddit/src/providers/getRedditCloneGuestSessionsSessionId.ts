import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditCloneMemberSessionTransformer } from "../transformers/RedditCloneMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneMemberSession> {
  // Query the session with transformer select for proper field mapping
  // Note: Guest authorization allows access, but actual session ownership
  // validation would require member context which guests don't have
  const session =
    await MyGlobal.prisma.reddit_clone_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      ...RedditCloneMemberSessionTransformer.select(),
    });
  // Transform and return the session
  return await RedditCloneMemberSessionTransformer.transform(session);
}
