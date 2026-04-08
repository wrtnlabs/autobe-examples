import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformCommunityCollector {
  export async function collect(props: {
    body: IRedditPlatformCommunity.ICreate;
    redditPlatformMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      icon_url: props.body.icon_url ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      owner: { connect: { id: props.redditPlatformMembers.id } },
    } satisfies Prisma.reddit_platform_communitiesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditPlatformCommunityCollector {
//         export async function collect(props: {
//           body: IRedditPlatformCommunity.ICreate;
//           redditPlatformMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       description: ...,
//       icon_url: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       owner: ...,
//       snapshots: ...,
//       communityMemberships: ...,
//       bannedUserRecords: ...,
//       subscriptions: ...,
//       posts: ...,
//       reports: ...,
//       banRecords: ...,
//       banRecordSnapshots: ...,
//           } satisfies Prisma.reddit_platform_communitiesCreateInput;
//         }
//       }
//--------------------------------------------------------------