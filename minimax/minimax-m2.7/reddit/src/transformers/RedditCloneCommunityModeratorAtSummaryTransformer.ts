import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityBanAtSummaryTransformer } from "./RedditCloneCommunityBanAtSummaryTransformer";
import { RedditCloneMemberSessionAtSummaryTransformer } from "./RedditCloneMemberSessionAtSummaryTransformer";

export namespace RedditCloneCommunityModeratorAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_community_moderatorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role: true,
        created_at: true,
        updated_at: true,
        member: RedditCloneMemberSessionAtSummaryTransformer.select(),
        assigner: RedditCloneMemberSessionAtSummaryTransformer.select(),
        community: RedditCloneCommunityBanAtSummaryTransformer.select(),
        issuedBans: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_community_bansFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_community_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunityModerator.ISummary> {
    return {
      id: input.id,
      role: input.role,
      createdAt: input.created_at.toISOString(),
      member: await RedditCloneMemberSessionAtSummaryTransformer.transform(
        input.member,
      ),
      assigner: input.assigner
        ? await RedditCloneMemberSessionAtSummaryTransformer.transform(
            input.assigner,
          )
        : undefined,
      community: await RedditCloneCommunityBanAtSummaryTransformer.transform(
        input.community,
      ),
    };
  }
}
