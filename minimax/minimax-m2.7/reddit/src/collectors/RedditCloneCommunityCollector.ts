import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneCommunityCollector {
  export async function collect(props: {
    body: IRedditCloneCommunity.ICreate;
    redditCloneMembers: IEntity;
    redditCloneMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description,
      subscriber_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.redditCloneMembers.id } },
      icon: props.body.icon
        ? {
            create: {
              id: v4(),
              reddit_clone_file_id: props.body.icon.id,
              created_at: new Date(),
            },
          }
        : undefined,
    } satisfies Prisma.reddit_clone_communitiesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditCloneCommunityCollector {
//         export async function collect(props: {
//           body: IRedditCloneCommunity.ICreate;
//           redditCloneMembers: IEntity; // from authorized actor
// redditCloneMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       description: ...,
//       subscriber_count: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       member: ...,
//       icon: ...,
//       communityModerators: ...,
//       communityBans: ...,
//       communityReports: ...,
//       subscriptions: ...,
//       posts: ...,
//       moderators: ...,
//       moderatorSnapshots: ...,
//       bans: ...,
//       reports: ...,
//           } satisfies Prisma.reddit_clone_communitiesCreateInput;
//         }
//       }
//--------------------------------------------------------------