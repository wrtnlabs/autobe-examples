import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace REdditLikeCommunityCommunityBanCollector {
  export async function collect(props: {
    body: IREdditLikeCommunityCommunityBan.ICreate;
    redditLikeCommunityCommunities: IEntity;
    redditLikeCommunityCommunityModerators: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      community: { connect: { id: props.redditLikeCommunityCommunities.id } },
      member: { connect: { id: props.body.member_id } },
      moderator: {
        connect: { id: props.redditLikeCommunityCommunityModerators.id },
      },
    } satisfies Prisma.reddit_like_community_community_bansCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace REdditLikeCommunityCommunityBanCollector {
//         export async function collect(props: {
//           body: IREdditLikeCommunityCommunityBan.ICreate;
//           redditLikeCommunityCommunities: IEntity; // from path parameter communityId
// redditLikeCommunityCommunityModerators: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       community: ...,
//       member: ...,
//       moderator: ...,
//           } satisfies Prisma.reddit_like_community_community_bansCreateInput;
//         }
//       }
//--------------------------------------------------------------