import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityFile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityCommunityFileCollector {
  export async function collect(props: {
    body: IRedditCommunityCommunityFile.ICreate;
    redditCommunityCommunities: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      file_path: props.body.file_path,
      filename: props.body.filename,
      mime_type: props.body.mime_type,
      file_size: props.body.file_size,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: {
        connect: { id: props.redditCommunityCommunities.id },
      },
    } satisfies Prisma.reddit_community_community_filesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditCommunityCommunityFileCollector {
//         export async function collect(props: {
//           body: IRedditCommunityCommunityFile.ICreate;
//           redditCommunityCommunities: IEntity; // from path parameter communityId
//           
//           
//         }) {
//           return {
//       id: ...,
//       file_path: ...,
//       filename: ...,
//       mime_type: ...,
//       file_size: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       community: ...,
//       communitySnapshots: ...,
//           } satisfies Prisma.reddit_community_community_filesCreateInput;
//         }
//       }
//--------------------------------------------------------------