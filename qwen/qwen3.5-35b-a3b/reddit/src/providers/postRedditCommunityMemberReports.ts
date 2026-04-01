import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityReportCollector } from "../collectors/RedditCommunityReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityReportTransformer } from "../transformers/RedditCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberReports(props: {
  member: MemberPayload;
  body: IRedditCommunityReport.ICreate;
}): Promise<IRedditCommunityReport> {
  const reporterId = props.member.id as string & tags.Format<"uuid">;
  const communityId = props.body.community_id as string & tags.Format<"uuid">;
  const targetType = props.body.target_type as "post" | "comment";
  const targetId = props.body.target_id as string & tags.Format<"uuid">;
  // Verify community exists
  await MyGlobal.prisma.reddit_community_communities.findFirstOrThrow({
    where: {
      id: communityId,
      deleted_at: null,
    },
  });
  // Verify target content exists and belongs to the community
  let authorId: string & tags.Format<"uuid">;
  if (targetType === "post") {
    const postText =
      await MyGlobal.prisma.reddit_community_post_texts.findFirstOrThrow({
        where: {
          id: targetId,
          deleted_at: null,
          reddit_community_post_id: communityId,
        },
      });
    const post = await MyGlobal.prisma.reddit_community_posts.findFirstOrThrow({
      where: {
        id: postText.reddit_community_post_id,
        deleted_at: null,
      },
      select: {
        author_id: true,
      },
    });
    authorId = post.author_id;
  } else {
    const comment =
      await MyGlobal.prisma.reddit_community_comments.findFirstOrThrow({
        where: {
          id: targetId,
          deleted_at: null,
          reddit_community_posts_id: communityId,
        },
        select: {
          reddit_community_members_id: true,
        },
      });
    authorId = comment.reddit_community_members_id;
  }
  // Prevent self-reporting
  if (authorId === reporterId) {
    throw new HttpException("Cannot report your own content", 409);
  }
  // Create the report using collector and transformer
  const created = await MyGlobal.prisma.reddit_community_reports.create({
    data: await RedditCommunityReportCollector.collect({
      body: {
        community_id: communityId,
        target_type: targetType,
        target_id: targetId,
        reason: props.body.reason,
      },
      reporter: {
        id: reporterId,
      } as IEntity,
    }),
    ...RedditCommunityReportTransformer.select(),
  });
  return await RedditCommunityReportTransformer.transform(created);
}
