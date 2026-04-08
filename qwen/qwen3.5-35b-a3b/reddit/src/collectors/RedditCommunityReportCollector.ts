import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityReportCollector {
  export async function collect(props: {
    body: IRedditCommunityReport.ICreate;
    reporter: IEntity;
    community: IEntity;
    targetPost: IEntity;
    targetComment?: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      status_id: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      reporter: { connect: { id: props.reporter.id } },
      community: { connect: { id: props.community.id } },
      targetPost: { connect: { id: props.targetPost.id } },
      targetComment: props.targetComment
        ? { connect: { id: props.targetComment.id } }
        : undefined,
    } satisfies Prisma.reddit_community_reportsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditCommunityReportCollector {
//         export async function collect(props: {
//           body: IRedditCommunityReport.ICreate;
//           redditCommunityMembers: IEntity; // from authorized actor
// redditCommunityPosts: IEntity; // from path parameter postId
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       status_id: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       reporter: ...,
//       community: ...,
//       targetPost: ...,
//       targetComment: ...,
//       resolution: ...,
//           } satisfies Prisma.reddit_community_reportsCreateInput;
//         }
//       }
//--------------------------------------------------------------