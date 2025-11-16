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

export async function postAuthCommunityModeratorRefresh(props: {
  communityModerator: CommunitymoderatorPayload;
  body: IRedditCommunityCommunityModerator.IRefresh;
}): Promise<IRedditCommunityCommunityModerator.IAuthorized> {
  const decoded = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  ) as {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "communitymoderator";
  };

  if (decoded.type !== "communitymoderator") {
    throw new HttpException("Invalid token type", 403);
  }

  const session =
    await MyGlobal.prisma.reddit_community_community_moderator_sessions.findFirst(
      {
        where: {
          id: decoded.session_id,
          reddit_community_community_moderator_id: decoded.id,
          expired_at: null,
        },
      },
    );

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (session.reddit_community_community_moderator_id === null) {
    throw new HttpException("Account has been deleted", 403);
  }

  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  await MyGlobal.prisma.reddit_community_community_moderator_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });

  return {
    id: session.reddit_community_community_moderator_id,
    email: "",
    created_at: toISOStringSafe(session.created_at),
    updated_at: toISOStringSafe(session.created_at),
    deleted_at: null,
    token,
    community: undefined,
  };
}
