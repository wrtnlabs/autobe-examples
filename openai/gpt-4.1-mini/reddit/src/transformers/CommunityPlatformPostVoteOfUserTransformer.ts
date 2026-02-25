import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { ICommunityPlatformPostVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfUser";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformPostVoteOfUserTransformer {
  export type Payload = Prisma.community_platform_post_vote_of_usersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        postVote: true,
        user: CommunityPlatformUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_post_vote_of_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostVoteOfUser> {
    return {
      id: input.id,
      vote_type: input.vote_type,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      postVote: {
        upvotes: 0, // Placeholder because actual counts not in this relation
        downvotes: 0, // Placeholder
      },
      user: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.user,
      ),
    };
  }
}
