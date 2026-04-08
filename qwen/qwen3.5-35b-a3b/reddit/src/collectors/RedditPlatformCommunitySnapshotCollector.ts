import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(date: Date): string {
  return date.toISOString();
}
export namespace RedditPlatformCommunitySnapshotCollector {
  export async function collect(props: {
    body: IRedditPlatformCommunitySnapshot.ICreate;
    redditPlatformCommunities: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? "",
      icon_url: props.body.icon_url ?? "",
      created_at: toISOStringSafe(new Date()),
      community: {
        connect: { id: props.redditPlatformCommunities.id },
      },
    } satisfies Prisma.reddit_platform_community_snapshotsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditPlatformCommunitySnapshotCollector {
//         export async function collect(props: {
//           body: IRedditPlatformCommunitySnapshot.ICreate;
//           redditPlatformCommunities: IEntity; // from path parameter {name}
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       description: ...,
//       icon_url: ...,
//       created_at: ...,
//       community: ...,
//           } satisfies Prisma.reddit_platform_community_snapshotsCreateInput;
//         }
//       }
//--------------------------------------------------------------