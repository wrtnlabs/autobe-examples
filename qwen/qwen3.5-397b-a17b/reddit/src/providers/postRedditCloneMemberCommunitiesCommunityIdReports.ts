import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneReportCollector } from "../collectors/RedditCloneReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneReportTransformer } from "../transformers/RedditCloneReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommunitiesCommunityIdReports(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneReport.ICreate;
}): Promise<IRedditCloneReport> {
  // Validate community exists
  await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
    where: { id: props.communityId, deleted_at: null },
  });
  // Validate target content exists and belongs to the community
  if (props.body.target_type === "POST") {
    await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
      where: {
        id: props.body.target_id,
        community_id: props.communityId,
        deleted_at: null,
      },
    });
  } else if (props.body.target_type === "COMMENT") {
    const comment =
      await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
        where: { id: props.body.target_id, deleted_at: null },
        select: { reddit_clone_post_id: true },
      });
    await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
      where: {
        id: comment.reddit_clone_post_id,
        community_id: props.communityId,
        deleted_at: null,
      },
    });
  } else {
    throw new HttpException(
      "Invalid target_type. Must be 'POST' or 'COMMENT'",
      400,
    );
  }
  // Create report using collector
  const created = await MyGlobal.prisma.reddit_clone_reports.create({
    data: await RedditCloneReportCollector.collect({
      body: props.body,
      reporter: { id: props.member.id },
      community: { id: props.communityId },
    }),
    ...RedditCloneReportTransformer.select(),
  });
  // Transform and return
  return await RedditCloneReportTransformer.transform(created);
}
