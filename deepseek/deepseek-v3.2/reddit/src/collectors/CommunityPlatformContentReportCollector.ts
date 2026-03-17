import { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(date: Date | null | undefined): string | null {
  return date?.toISOString() ?? null;
}
export namespace CommunityPlatformContentReportCollector {
  export async function collect(props: {
    body: ICommunityPlatformContentReport.ICreate;
    reporterMember: IEntity;
    session: IEntity;
  }) {
    const id: string = v4();
    // Validate exactly one target provided
    if (!props.body.postId && !props.body.commentId) {
      throw new Error("Either postId or commentId must be provided");
    }
    if (props.body.postId && props.body.commentId) {
      throw new Error("Only one of postId or commentId can be provided");
    }
    let communityId: string;
    // Derive community from target content
    if (props.body.postId) {
      const post =
        await MyGlobal.prisma.community_platform_posts.findFirstOrThrow({
          where: { id: props.body.postId },
          select: { community_platform_community_id: true },
        });
      communityId = post.community_platform_community_id;
    } else {
      // commentId is guaranteed to be non-null here because we validated
      // but TypeScript doesn't know that - use ! assertion
      const commentId = props.body.commentId!;
      const comment =
        await MyGlobal.prisma.community_platform_comments.findFirstOrThrow({
          where: { id: commentId },
          select: { post_id: true },
        });
      const post =
        await MyGlobal.prisma.community_platform_posts.findFirstOrThrow({
          where: { id: comment.post_id },
          select: { community_platform_community_id: true },
        });
      communityId = post.community_platform_community_id;
    }
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      reporterMember: { connect: { id: props.reporterMember.id } },
      community: { connect: { id: communityId } },
      // Polymorphic target creation - include all required fields
      postReport: props.body.postId
        ? {
            create: {
              id: v4(),
              post: { connect: { id: props.body.postId } },
              created_at: new Date(),
              updated_at: new Date(),
            },
          }
        : undefined,
      commentReport: props.body.commentId
        ? {
            create: {
              id: v4(),
              comment: { connect: { id: props.body.commentId } },
              created_at: new Date(),
              updated_at: new Date(),
            },
          }
        : undefined,
      // Moderation actions (not applicable at creation)
      approval: undefined,
      dismissal: undefined,
    } satisfies Prisma.community_platform_content_reportsCreateInput;
  }
}
