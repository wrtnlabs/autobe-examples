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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityReportTransformer } from "../transformers/RedditCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberReports(props: {
  member: MemberPayload;
  body: IRedditCommunityReport.ICreate;
}): Promise<IRedditCommunityReport> {
  const reason = props.body.reason.trim();
  // Validate target content exists and belongs to the specified community
  const authorId: string = await (async () => {
    if (props.body.target_type === "post") {
      const post =
        await MyGlobal.prisma.reddit_community_posts.findFirstOrThrow({
          where: {
            id: props.body.target_id,
            deleted_at: null,
            community_id: props.body.community_id,
          },
          select: { author_id: true },
        });
      return post.author_id;
    } else {
      const comment =
        await MyGlobal.prisma.reddit_community_comments.findFirstOrThrow({
          where: {
            id: props.body.target_id,
            deleted_at: null,
          },
          select: {
            reddit_community_posts_id: true,
            author: { select: { id: true } },
          },
        });
      const post =
        await MyGlobal.prisma.reddit_community_posts.findFirstOrThrow({
          where: {
            id: comment.reddit_community_posts_id,
            community_id: props.body.community_id,
            deleted_at: null,
          },
        });
      return post.author_id;
    }
  })();
  if (authorId === props.member.id) {
    throw new HttpException("Cannot report your own content", 409);
  }
  const created = await MyGlobal.prisma.reddit_community_reports.create({
    data: {
      id: v4(),
      reporter: { connect: { id: props.member.id } },
      community: { connect: { id: props.body.community_id } },
      target_type: props.body.target_type,
      target_id: props.body.target_id,
      reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  const report =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: { id: created.id },
      ...RedditCommunityReportTransformer.select(),
    });
  return await RedditCommunityReportTransformer.transform(report);
}
