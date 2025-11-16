import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminRedditCommunityGuestsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityGuest.IUpdate;
}): Promise<IRedditCommunityGuest> {
  const existing = (await MyGlobal.prisma.reddit_community_guests.findUnique({
    where: { id: props.id },
  })) as IRedditCommunityGuest | null;

  if (!existing) {
    throw new HttpException("Guest not found", 404);
  }

  const updateData: Partial<{
    ip_address: string | null;
    user_agent: string | null;
    referrer_url: string | null;
    updated_at: string & tags.Format<"date-time">;
  }> = {};

  if (Object.prototype.hasOwnProperty.call(props.body, "ip_address")) {
    updateData.ip_address =
      props.body.ip_address === undefined ? undefined : props.body.ip_address;
  }
  if (Object.prototype.hasOwnProperty.call(props.body, "user_agent")) {
    updateData.user_agent =
      props.body.user_agent === undefined ? undefined : props.body.user_agent;
  }
  if (Object.prototype.hasOwnProperty.call(props.body, "referrer_url")) {
    updateData.referrer_url =
      props.body.referrer_url === undefined
        ? undefined
        : props.body.referrer_url;
  }

  updateData.updated_at = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.reddit_community_guests.update({
    where: { id: props.id },
    data: updateData,
  });

  return {
    id: updated.id,
    session_id: existing.session_id,
    ip_address:
      existing.ip_address !== null && existing.ip_address !== undefined
        ? existing.ip_address
        : "",
    user_agent:
      existing.user_agent !== null && existing.user_agent !== undefined
        ? existing.user_agent
        : "",
    device_type:
      existing.device_type !== null && existing.device_type !== undefined
        ? existing.device_type
        : "",
    created_at: toISOStringSafe(existing.created_at),
    updated_at: updated.updated_at
      ? toISOStringSafe(updated.updated_at)
      : undefined,
  };
}
