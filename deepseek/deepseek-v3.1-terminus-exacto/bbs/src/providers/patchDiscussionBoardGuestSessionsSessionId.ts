import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { DiscussionBoardGuestSessionTransformer } from "../transformers/DiscussionBoardGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardGuestSession.IRequest;
}): Promise<IDiscussionBoardGuestSession> {
  // Verify session exists and belongs to the guest
  const session =
    await MyGlobal.prisma.discussion_board_guest_sessions.findUniqueOrThrow({
      where: {
        id: props.sessionId,
        discussion_board_guest_id: props.guest.id,
      },
    });
  // Build update data from request body
  const updateData: Prisma.discussion_board_guest_sessionsUpdateInput = {};
  if (props.body.ip !== undefined) updateData.ip = props.body.ip;
  if (props.body.href !== undefined) updateData.href = props.body.href;
  if (props.body.referrer !== undefined)
    updateData.referrer = props.body.referrer;
  if (props.body.created_at !== undefined)
    updateData.created_at = new Date(props.body.created_at);
  if (props.body.expired_at !== undefined)
    updateData.expired_at = new Date(props.body.expired_at);
  // Update the session
  const updated = await MyGlobal.prisma.discussion_board_guest_sessions.update({
    where: { id: props.sessionId },
    data: updateData,
    ...DiscussionBoardGuestSessionTransformer.select(),
  });
  return await DiscussionBoardGuestSessionTransformer.transform(updated);
}
