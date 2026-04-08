import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityCommentReportCollector {
  export async function collect(props: {
    body: IRedditCommunityCommentReport.ICreate;
    redditCommunityComments: IEntity;
    redditCommunityMembers: IEntity;
  }) {
    // Query comment to get post_id for indirect community reference
    const comment =
      await MyGlobal.prisma.reddit_community_comments.findFirstOrThrow({
        where: { id: props.redditCommunityComments.id },
        include: { post: { select: { reddit_community_community_id: true } } },
      });
    return {
      // Scalar fields
      id: v4(),
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // Belongs to relations
      comment: { connect: { id: props.redditCommunityComments.id } },
      reporter: { connect: { id: props.redditCommunityMembers.id } },
      community: {
        connect: { id: comment.post.reddit_community_community_id },
      },
    } satisfies Prisma.reddit_community_comment_reportsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditCommunityCommentReportCollector {
//         export async function collect(props: {
//           body: IRedditCommunityCommentReport.ICreate;
//           redditCommunityComments: IEntity; // from path parameter commentId
// redditCommunityMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       comment: ...,
//       reporter: ...,
//       community: ...,
//           } satisfies Prisma.reddit_community_comment_reportsCreateInput;
//         }
//       }
//--------------------------------------------------------------