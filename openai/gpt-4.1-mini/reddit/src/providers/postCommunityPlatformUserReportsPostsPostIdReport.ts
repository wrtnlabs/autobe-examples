import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostReportCollector } from "../collectors/CommunityPlatformPostReportCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformPostReportTransformer } from "../transformers/CommunityPlatformPostReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserReportsPostsPostIdReport(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostReport.ICreate;
}): Promise<ICommunityPlatformPostReport> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Verify the post exists
    const post = await tx.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
    });
    // Find reporting user entity
    const reportingUser = await tx.community_platform_users.findUniqueOrThrow({
      where: { id: props.user.id },
    });
    // Prepare data using collector
    const data = await CommunityPlatformPostReportCollector.collect({
      body: props.body,
      reportingUser: reportingUser,
      reportedPost: post,
    });
    // Create report
    const created = await tx.community_platform_post_reports.create({
      data: data,
      ...CommunityPlatformPostReportTransformer.select(),
    });
    // Transform and return
    return await CommunityPlatformPostReportTransformer.transform(created);
  });
}
