import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeCommunityModeratorCollector {
  export async function collect(props: {
    body: IRedditLikeCommunityModerator.ICreate;
    redditLikeCommunityCommunities: IEntity;
  }) {
    return {
      id: v4(),
      authority_type: "MODERATOR",
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.body.member_id } },
      community: {
        connect: {
          id:
            props.body.community_id ?? props.redditLikeCommunityCommunities.id,
        },
      },
    } satisfies Prisma.reddit_like_community_moderatorsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditLikeCommunityModeratorCollector {
//         export async function collect(props: {
//           body: IRedditLikeCommunityModerator.ICreate;
//           redditLikeCommunityCommunities: IEntity; // from path parameter communityId
//           
//           
//         }) {
//           return {
//       id: ...,
//       authority_type: ...,
//       created_at: ...,
//       updated_at: ...,
//       member: ...,
//       community: ...,
//           } satisfies Prisma.reddit_like_community_moderatorsCreateInput;
//         }
//       }
//--------------------------------------------------------------