import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace REdditLikeCommunityReportCollector {
  export async function collect(props: {
    body: IREdditLikeCommunityReport.ICreate;
    redditLikeCommunityMembers: IEntity;
  }) {
    const id = v4();
    let target_type: string;
    let communityId: string;
    let onPost:
      | {
          create: {
            id: string;
            post: {
              connect: {
                id: string;
              };
            };
          };
        }
      | undefined;
    let reportOnComment:
      | {
          create: {
            id: string;
            comment: {
              connect: {
                id: string;
              };
            };
            created_at: Date;
            updated_at: Date;
            deleted_at: null;
          };
        }
      | undefined;
    if (props.body.postId) {
      const post =
        await MyGlobal.prisma.reddit_like_community_posts.findFirstOrThrow({
          where: { id: props.body.postId },
        });
      target_type = "post";
      communityId = post.community_id;
      onPost = {
        create: {
          id: v4(),
          post: { connect: { id: props.body.postId } },
        },
      };
    } else if (props.body.commentId) {
      const comment =
        await MyGlobal.prisma.reddit_like_community_post_comments.findFirstOrThrow(
          {
            where: { id: props.body.commentId },
            include: { post: { select: { community_id: true } } },
          },
        );
      target_type = "comment";
      communityId = comment.post.community_id;
      reportOnComment = {
        create: {
          id: v4(),
          comment: { connect: { id: props.body.commentId } },
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      };
    } else {
      throw new Error("Either postId or commentId must be provided");
    }
    return {
      id,
      target_type,
      reason: props.body.reason,
      status: "pending",
      resolved_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: communityId } },
      reportedBy: { connect: { id: props.redditLikeCommunityMembers.id } },
      resolvedBy: undefined,
      onPost,
      reportOnComment,
    } satisfies Prisma.reddit_like_community_reportsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace REdditLikeCommunityReportCollector {
//         export async function collect(props: {
//           body: IREdditLikeCommunityReport.ICreate;
//           redditLikeCommunityMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       target_type: ...,
//       reason: ...,
//       status: ...,
//       resolved_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       community: ...,
//       reportedBy: ...,
//       resolvedBy: ...,
//       onPost: ...,
//       reportOnComment: ...,
//           } satisfies Prisma.reddit_like_community_reportsCreateInput;
//         }
//       }
//--------------------------------------------------------------