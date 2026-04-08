import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneCommunityReportCollector {
  export async function collect(props: {
    body: IRedditCloneCommunityReport.ICreate;
    redditCloneCommunities: IEntity;
    redditCloneMembers: IEntity;
    redditCloneMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      target_type: props.body.target_type,
      target_id: props.body.target_id,
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      reporter: { connect: { id: props.redditCloneMembers.id } },
      community: { connect: { id: props.redditCloneCommunities.id } },
    } satisfies Prisma.reddit_clone_reportsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditCloneCommunityReportCollector {
//         export async function collect(props: {
//           body: IRedditCloneCommunityReport.ICreate;
//           redditCloneCommunities: IEntity; // from path parameter communityId
// redditCloneMembers: IEntity; // from authorized actor
// redditCloneMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       target_type: ...,
//       target_id: ...,
//       reason: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       reporter: ...,
//       community: ...,
//           } satisfies Prisma.reddit_clone_reportsCreateInput;
//         }
//       }
//--------------------------------------------------------------