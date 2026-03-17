import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { IRedditLikeReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditLikeReportTransformer } from "../transformers/RedditLikeReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeOwnerCommunitiesCommunityIdReportsPending(props: {
  owner: OwnerPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditLikeReport> {
  // Verify community exists and owner has authority
  const community = await MyGlobal.prisma.reddit_like_communities.findUnique({
    where: { id: props.communityId },
    select: { owner_id: true },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Check if owner is the community owner or a moderator
  const isOwner = community.owner_id === props.owner.id;
  if (!isOwner) {
    const moderator = await MyGlobal.prisma.reddit_like_moderators.findFirst({
      where: {
        member_id: props.owner.id,
        community_id: props.communityId,
        deleted_at: null,
      },
    });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Query pending reports for this community
  const reports = await MyGlobal.prisma.reddit_like_reports.findMany({
    where: {
      community_id: props.communityId,
      status: "pending",
    },
    orderBy: { created_at: "desc" },
    ...RedditLikeReportTransformer.select(),
  });
  // Transform reports to DTOs
  const data = await ArrayUtil.asyncMap(
    reports,
    RedditLikeReportTransformer.transform,
  );
  // Return paginated response
  return {
    data,
    pagination: {
      current: 1,
      limit: data.length,
      records: data.length,
      pages: data.length > 0 ? 1 : 0,
    } satisfies IPage.IPagination,
  };
}
