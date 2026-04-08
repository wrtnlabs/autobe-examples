import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneUserProfileAtSummaryTransformer } from "./RedditCloneUserProfileAtSummaryTransformer";

export namespace RedditCloneMemberAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        username: true,
        created_at: true,
        profile: RedditCloneUserProfileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneMember.ISummary> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      created_at: toISOStringSafe(input.created_at),
      profile: input.profile
        ? typia.assert<IRedditCloneUserProfile.ISummary>(
            await RedditCloneUserProfileAtSummaryTransformer.transform(
              input.profile,
            ),
          )
        : (typia.assert<IRedditCloneUserProfile.ISummary>(
            await RedditCloneUserProfileAtSummaryTransformer.transform(
              input.profile!,
            ),
          ) as never),
    };
  }
}
