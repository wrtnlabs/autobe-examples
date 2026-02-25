import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommunityAtSummaryTransformer } from "../transformers/RedditCommunityCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthCommunityModeratorLogin(props: {
  body: IRedditCommunityCommunityModerator.ILogin;
}): Promise<IRedditCommunityCommunityModerator.IAuthorized> {
  // 1. Find moderator by email with password_hash
  const moderator =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: { email: props.body.email, is_deleted: false },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma_score: true,
        created_at: true,
        updated_at: true,
        community_id: true,
        password_hash: true,
      },
    });
  if (!moderator) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    moderator.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Create NEW session with required href and referrer fields (using blank defaults since they are not in props)
  const accessExpires: string & tags.Format<"date-time"> = new Date(
    Date.now() + 30 * 60 * 1000,
  ).toISOString();
  const refreshExpires: string & tags.Format<"date-time"> = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const session =
    await MyGlobal.prisma.reddit_community_community_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_moderator_id: moderator.id,
        ip: "",
        href: "",
        referrer: "",
        created_at: new Date().toISOString(),
        expired_at: refreshExpires,
      },
    });
  // 4. Generate JWT tokens with correct payload structure
  const access_token = jwt.sign(
    {
      type: "communityModerator",
      id: moderator.id,
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30m", issuer: "redditCommunity" },
  );
  const refresh = jwt.sign(
    {
      type: "communityModerator",
      id: moderator.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "14d", issuer: "redditCommunity" },
  );
  // 5. Construct proper IAuthorizationToken with all required fields
  const token: IAuthorizationToken = {
    access: access_token,
    refresh,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 6. Use the already-loaded transformer to get community subscriber_count
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: moderator.community_id },
      ...RedditCommunityCommunityAtSummaryTransformer.select(),
    });
  // 7. Transform using the verified transformer
  const transformedCommunity = community
    ? await RedditCommunityCommunityAtSummaryTransformer.transform(community)
    : null;
  // 8. Return IAuthorized - match exact DTO structure with transformer-validated data
  return {
    id: moderator.id as string & tags.Format<"uuid">,
    email: moderator.email as string & tags.Format<"email">,
    username: moderator.username,
    display_name: moderator.display_name,
    bio:
      moderator.bio !== undefined && moderator.bio !== null
        ? moderator.bio
        : undefined,
    avatar_url: moderator.avatar_url
      ? (moderator.avatar_url as string & tags.Format<"uri">)
      : "",
    karma_score: moderator.karma_score as number & tags.Type<"int32">,
    created_at: moderator.created_at.toISOString(),
    updated_at: moderator.updated_at.toISOString(),
    community_id: moderator.community_id as string & tags.Format<"uuid">,
    user: {
      id: moderator.id as string & tags.Format<"uuid">,
      username: moderator.username,
      display_name: moderator.display_name,
      bio:
        moderator.bio !== undefined && moderator.bio !== null
          ? moderator.bio
          : undefined,
      avatar_url: moderator.avatar_url
        ? (moderator.avatar_url as string & tags.Format<"uri">)
        : null,
      karma_score: moderator.karma_score as number & tags.Type<"int32">,
      created_at: moderator.created_at.toISOString(),
    } satisfies IRedditCommunityMember.ISummary,
    community:
      transformedCommunity ??
      ({
        id: "" as string & tags.Format<"uuid">,
        name: "",
        description: "",
        icon_url: null,
        subscriber_count: 0,
        created_at: "1970-01-01T00:00:00Z" as string & tags.Format<"date-time">,
        updated_at: "1970-01-01T00:00:00Z" as string & tags.Format<"date-time">,
      } satisfies IRedditCommunityCommunity.ISummary),
    token,
    access_token,
  } satisfies IRedditCommunityCommunityModerator.IAuthorized;
}
