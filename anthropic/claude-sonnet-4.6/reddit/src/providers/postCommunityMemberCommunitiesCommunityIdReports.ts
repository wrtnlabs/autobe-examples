import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityReportCollector } from "../collectors/CommunityReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityReportTransformer } from "../transformers/CommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberCommunitiesCommunityIdReports(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityReport.ICreate;
}): Promise<ICommunityReport> {
  // Step 1: Validate community exists and is not deleted
  await MyGlobal.prisma.community_communities.findFirstOrThrow({
    where: { id: props.communityId, deleted_at: null },
    select: { id: true },
  });
  // Step 2: Validate exactly one of post_id or comment_id is provided
  const hasPost = props.body.post_id != null;
  const hasComment = props.body.comment_id != null;
  if (hasPost === hasComment) {
    throw new HttpException(
      "Exactly one of post_id or comment_id must be provided",
      422,
    );
  }
  // Step 3: If post_id, verify post exists and belongs to the community
  if (hasPost) {
    const postId = props.body.post_id ?? "";
    const post = await MyGlobal.prisma.community_posts.findFirstOrThrow({
      where: { id: postId, deleted_at: null },
      select: { community_community_id: true },
    });
    if (post.community_community_id !== props.communityId) {
      throw new HttpException(
        "The reported post does not belong to the specified community",
        422,
      );
    }
  }
  // Step 4: If comment_id, verify comment exists and its parent post belongs to the community
  if (hasComment) {
    const commentId = props.body.comment_id ?? "";
    const comment = await MyGlobal.prisma.community_comments.findFirstOrThrow({
      where: { id: commentId, deleted_at: null },
      select: {
        post: {
          select: { community_community_id: true },
        },
      },
    });
    if (comment.post.community_community_id !== props.communityId) {
      throw new HttpException(
        "The reported comment does not belong to the specified community",
        422,
      );
    }
  }
  // Step 5: Create the report using the Collector, then fetch with Transformer
  const created = await MyGlobal.prisma.community_reports.create({
    data: await CommunityReportCollector.collect({
      body: props.body,
      communityCommunities: { id: props.communityId },
      communityMembers: { id: props.member.id },
      communityMemberSessions: { id: props.member.session_id },
    }),
    ...CommunityReportTransformer.select(),
  });
  // Step 6: Transform and return the full ICommunityReport
  return CommunityReportTransformer.transform(created);
}
