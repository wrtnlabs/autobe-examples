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
  /**
   * Collects community creation data from DTO and auth context.
   * Maps IRedditCloneCommunity.ICreate to Prisma.reddit_clone_communitiesCreateInput.
   *
   * @param props.body - DTO containing name and description for new community
   * @param props.redditCloneMembers - IEntity of the authenticated member creating the community (becomes owner)
   * @param props.redditCloneMemberSessions - IEntity of the authenticated session
   */
  export async function collect(props: {
    body: IRedditCloneCommunity.ICreate;
    redditCloneMembers: IEntity;
    redditCloneMemberSessions: IEntity;
  }) {
    return {
      // Scalar fields
      id: v4(),
      name: props.body.name,
      description: props.body.description,
      subscriber_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relation - connect owner from auth context
      member: { connect: { id: props.redditCloneMembers.id } },
      // NOTE: icon field from DTO is ignored - file association is created separately
      // NOTE: All hasMany relations are reverse relations - cannot be created from parent
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