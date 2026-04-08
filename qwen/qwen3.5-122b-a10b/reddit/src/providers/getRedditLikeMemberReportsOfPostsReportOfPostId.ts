import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { IRedditLikeReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeReportOfPostTransformer } from "../transformers/RedditLikeReportOfPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberReportsOfPostsReportOfPostId(props: {
  member: MemberPayload;
  reportOfPostId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeReportOfPost> {
  // Find the report-post linkage record
  const record =
    await MyGlobal.prisma.reddit_like_report_of_posts.findFirstOrThrow({
      ...RedditLikeReportOfPostTransformer.select(),
      where: {
        id: props.reportOfPostId,
        deleted_at: null,
      },
    });
  // Extract community ID from the reported post for authorization check
  const communityId = record.post.community.id;
  // Check if member is the owner of the community
  const communityOwner =
    await MyGlobal.prisma.reddit_like_communities.findUnique({
      where: { id: communityId },
      select: { owner_id: true },
    });
  if (communityOwner && communityOwner.owner_id === props.member.id) {
    // Member is the owner, authorized
    return await RedditLikeReportOfPostTransformer.transform(record);
  }
  // Check if member is a moderator of the community
  const isModerator =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        reddit_like_community_id: communityId,
        reddit_like_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (isModerator) {
    // Member is a moderator, authorized
    return await RedditLikeReportOfPostTransformer.transform(record);
  }
  // Member lacks access permissions
  throw new HttpException("Forbidden", 403);
}
