import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneUserProfileAtSummaryTransformer } from "./RedditCloneUserProfileAtSummaryTransformer";

export namespace RedditCloneModeratorTransformer {
  export type Payload = Prisma.reddit_clone_moderatorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        userProfile: RedditCloneUserProfileAtSummaryTransformer.select(),
        sessions: {
          select: {},
        } satisfies Prisma.reddit_clone_moderator_sessionsFindManyArgs,
        passwordResets: {
          select: {},
        } satisfies Prisma.reddit_clone_moderator_password_resetsFindManyArgs,
        issuedBans: {
          select: {},
        } satisfies Prisma.reddit_clone_community_bansFindManyArgs,
        reportActions: {
          select: {},
        } satisfies Prisma.reddit_clone_report_actionsFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneModerator> {
    return {
      id: input.id,
      email: input.email,
      reddit_clone_user_profile_id: input.userProfile.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      userProfile: await RedditCloneUserProfileAtSummaryTransformer.transform(
        input.userProfile,
      ),
    };
  }
}
