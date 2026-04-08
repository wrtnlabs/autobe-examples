import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
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
  // Validate target content exists and is not deleted
  if (props.body.report_type === "post") {
    await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
      where: {
        id: props.body.target_id,
        deleted_at: null,
      },
    });
  } else {
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: {
        id: props.body.target_id,
        deleted_at: null,
      },
    });
  }
  const record = await MyGlobal.prisma.reddit_community_reports.create({
    data: await RedditCommunityReportCollector.collect({
      body: props.body,
      redditCommunityMembers: { id: props.member.id },
    }),
    ...RedditCommunityReportTransformer.select(),
  });
  return await RedditCommunityReportTransformer.transform(record);
}
