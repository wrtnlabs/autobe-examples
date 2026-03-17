import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformReportCollector } from "../collectors/CommunityPlatformReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberReports(props: {
  member: MemberPayload;
  body: ICommunityPlatformReport.ICreate;
}): Promise<ICommunityPlatformReport> {
  // Validate member is not banned from the community
  const ban = await MyGlobal.prisma.community_platform_bans.findFirst({
    where: {
      member_id: props.member.id,
      community_id: props.body.community_id,
      deleted_at: null,
    },
  });
  if (ban !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Validate target exists in the specified community
  if (props.body.target_type === "post") {
    const post = await MyGlobal.prisma.community_platform_posts.findUnique({
      where: { id: props.body.target_id },
      select: { id: true, community_id: true },
    });
    if (post === null || post.community_id !== props.body.community_id) {
      throw new HttpException("Post not found in this community", 404);
    }
  } else if (props.body.target_type === "comment") {
    const comment =
      await MyGlobal.prisma.community_platform_comments.findUnique({
        where: { id: props.body.target_id },
        select: { id: true, post: { select: { community_id: true } } },
      });
    if (
      comment === null ||
      comment.post.community_id !== props.body.community_id
    ) {
      throw new HttpException("Comment not found in this community", 404);
    }
  }
  // Create report using collector
  const created = await MyGlobal.prisma.community_platform_reports.create({
    data: await CommunityPlatformReportCollector.collect({
      body: props.body,
      communityPlatformMembers: { id: props.member.id },
      communityPlatformMemberSessions: { id: props.member.session_id },
    }),
    ...CommunityPlatformReportTransformer.select(),
  });
  return await CommunityPlatformReportTransformer.transform(created);
}
