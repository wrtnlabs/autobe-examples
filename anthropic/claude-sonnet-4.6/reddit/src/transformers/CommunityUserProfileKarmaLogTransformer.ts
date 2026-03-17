import { ICommunityUserProfileKarmaLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfileKarmaLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityUserProfileKarmaLogTransformer {
  export type Payload = Prisma.community_user_profile_karma_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        community_user_profile_id: true,
        community_post_vote_id: true,
        community_comment_vote_id: true,
        source_type: true,
        delta: true,
        created_at: true,
      },
    } satisfies Prisma.community_user_profile_karma_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityUserProfileKarmaLog> {
    return {
      id: input.id,
      communityUserProfileId: input.community_user_profile_id,
      communityPostVoteId: input.community_post_vote_id ?? null,
      communityCommentVoteId: input.community_comment_vote_id ?? null,
      sourceType: input.source_type,
      delta: input.delta,
      createdAt: input.created_at.toISOString(),
    };
  }
}
