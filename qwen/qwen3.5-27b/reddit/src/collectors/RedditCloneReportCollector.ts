import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneReportCollector {
  export async function collect(props: {
    body: IRedditCloneReport.ICreate;
    redditCloneMembers: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    // Query reported content to get community_id
    let communityId: string;
    if (props.body.content_type === "post" && props.body.post_id) {
      const post = await MyGlobal.prisma.reddit_clone_posts.findFirstOrThrow({
        where: { id: props.body.post_id },
        select: { reddit_clone_community_id: true },
      });
      communityId = post.reddit_clone_community_id;
    } else if (props.body.content_type === "comment" && props.body.comment_id) {
      const comment =
        await MyGlobal.prisma.reddit_clone_comments.findFirstOrThrow({
          where: { id: props.body.comment_id },
          select: { reddit_clone_post_id: true },
        });
      // Get post to find community
      const post = await MyGlobal.prisma.reddit_clone_posts.findFirstOrThrow({
        where: { id: comment.reddit_clone_post_id },
        select: { reddit_clone_community_id: true },
      });
      communityId = post.reddit_clone_community_id;
    } else {
      throw new Error("Invalid report: missing post_id or comment_id");
    }
    return {
      id,
      content_type: props.body.content_type,
      reason: props.body.reason,
      status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      reporter: { connect: { id: props.redditCloneMembers.id } },
      reportedPost:
        props.body.content_type === "post" && props.body.post_id
          ? { connect: { id: props.body.post_id } }
          : undefined,
      reportedComment:
        props.body.content_type === "comment" && props.body.comment_id
          ? { connect: { id: props.body.comment_id } }
          : undefined,
      community: { connect: { id: communityId } },
    } satisfies Prisma.reddit_clone_reportsCreateInput;
  }
}
