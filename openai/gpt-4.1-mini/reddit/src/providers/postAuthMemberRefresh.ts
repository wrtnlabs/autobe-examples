import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postAuthMemberRefresh(props: {
  member: MemberPayload;
  body: IRedditCommunityMember.IRefresh;
}): Promise<IRedditCommunityMember.IAuthorized> {
  const { body } = props;

  let decodedToken: unknown;
  try {
    decodedToken = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException(
      "Unauthorized: Invalid or expired refresh token",
      401,
    );
  }

  if (
    typeof decodedToken !== "object" ||
    decodedToken === null ||
    !("id" in decodedToken) ||
    (decodedToken as any).type !== "member"
  ) {
    throw new HttpException("Unauthorized: Invalid token payload", 401);
  }

  const userId = (decodedToken as any).id;
  if (typeof userId !== "string") {
    throw new HttpException("Unauthorized: Invalid token user id", 401);
  }

  const memberRecord = await MyGlobal.prisma.reddit_community_members.findFirst(
    {
      where: { id: userId, deleted_at: null },
    },
  );

  if (!memberRecord) {
    throw new HttpException("Unauthorized: User not found or deleted", 401);
  }

  const nowTimestamp = Date.now();
  const accessExpireMs = 1000 * 60 * 60;
  const refreshExpireMs = 1000 * 60 * 60 * 24 * 7;

  const accessExpiredAt = toISOStringSafe(
    new Date(nowTimestamp + accessExpireMs),
  );
  const refreshRefreshableUntil = toISOStringSafe(
    new Date(nowTimestamp + refreshExpireMs),
  );

  const accessToken = jwt.sign(
    { id: userId, type: "member" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { id: userId, type: "member", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: memberRecord.id,
    email: memberRecord.email,
    password_hash: memberRecord.password_hash,
    is_email_verified: memberRecord.is_email_verified,
    created_at: toISOStringSafe(memberRecord.created_at),
    updated_at: toISOStringSafe(memberRecord.updated_at),
    deleted_at:
      memberRecord.deleted_at !== null && memberRecord.deleted_at !== undefined
        ? toISOStringSafe(memberRecord.deleted_at)
        : null,
    reddit_community_community_moderators: undefined,
    reddit_community_posts: undefined,
    reddit_community_comments: undefined,
    reddit_community_post_votes: undefined,
    reddit_community_comment_votes: undefined,
    reddit_community_user_karma: undefined,
    reddit_community_community_subscriptions: undefined,
    reddit_community_reports_of_reporter_member_id: undefined,
    reddit_community_reports_of_reported_member_id: undefined,
    reddit_community_report_actions: undefined,
    reddit_community_user_profiles: undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt as string & tags.Format<"date-time">,
      refreshable_until: refreshRefreshableUntil as string &
        tags.Format<"date-time">,
    },
  };
}
