import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function postAuthCommunityModeratorJoin(props: {
  communityModerator: CommunitymoderatorPayload;
  body: IRedditCommunityCommunityModerator.ICreate;
}): Promise<IRedditCommunityCommunityModerator.IAuthorized> {
  const existingModerator =
    await MyGlobal.prisma.reddit_community_community_moderators.findUnique({
      where: { email: props.body.email },
    });
  if (existingModerator !== null) {
    throw new HttpException("Email already registered", 409);
  }
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  const newModeratorId = v4();
  const newSessionId = v4();

  const moderator =
    await MyGlobal.prisma.reddit_community_community_moderators.create({
      data: {
        id: newModeratorId,
        email: props.body.email,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  const accessExpire = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpire = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const session =
    await MyGlobal.prisma.reddit_community_community_moderator_sessions.create({
      data: {
        id: newSessionId,
        reddit_community_community_moderator_id: newModeratorId,
        ip: "",
        href: "",
        referrer: "",
        created_at: now,
        expired_at: accessExpire,
      },
    });

  const token = {
    access: jwt.sign(
      {
        type: "communitymoderator",
        id: newModeratorId,
        session_id: newSessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "communitymoderator",
        id: newModeratorId,
        session_id: newSessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpire,
    refreshable_until: refreshExpire,
  };

  return {
    id: newModeratorId,
    email: props.body.email,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    token,
  };
}
