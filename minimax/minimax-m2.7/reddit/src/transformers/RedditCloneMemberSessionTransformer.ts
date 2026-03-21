import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneUserProfileAtSummaryTransformer } from "./RedditCloneUserProfileAtSummaryTransformer";

export namespace RedditCloneMemberSessionTransformer {
  export type Payload = Prisma.reddit_clone_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        username: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: null,
        passwordResets: null,
        emailVerifications: null,
        profile: {
          select: {
            id: true,
            display_name: true,
            bio: true,
            created_at: true,
            updated_at: true,
            member: {
              select: {
                id: true,
                username: true,
                created_at: true,
              },
            },
            avatarFileAssociation: {
              select: {
                id: true,
                target_type: true,
                target_id: true,
                created_at: true,
                updated_at: true,
                file: {
                  select: {
                    id: true,
                    original_filename: true,
                    mime_type: true,
                    file_size: true,
                    status: true,
                    created_at: true,
                    uploader: {
                      select: {
                        id: true,
                        username: true,
                        created_at: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        karma: {
          select: {
            id: true,
            reddit_clone_member_karma: true,
            created_at: true,
            updated_at: true,
          },
        },
        ownedCommunities: null,
        communityModerations: null,
        assignedCommunityModerators: null,
        communityBans: null,
        submittedReports: null,
        resolvedReports: null,
        subscriptions: null,
        posts: null,
        comments: null,
        postVotes: null,
        moderatorRoles: null,
        assignedModerators: null,
        moderatorSnapshots: null,
        assignedModeratorSnapshots: null,
        bansReceiveds: null,
        bansIssueds: null,
        reports: null,
        uploadedFiles: null,
      },
    } satisfies Prisma.reddit_clone_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneMemberSession> {
    const memberSummary: IRedditCloneMemberSession.ISummary = {
      id: input.profile?.member?.id ?? input.id,
      username: input.profile?.member?.username ?? input.username,
      created_at: input.profile?.member?.created_at
        ? toISOStringSafe(input.profile.member.created_at)
        : toISOStringSafe(input.created_at),
      profile: input.profile
        ? await RedditCloneUserProfileAtSummaryTransformer.transform(
            input.profile,
          )
        : null,
      karma_count: input.karma?.reddit_clone_member_karma ?? 0,
    };
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      profile: input.profile
        ? await RedditCloneUserProfileAtSummaryTransformer.transform(
            input.profile,
          )
        : null,
      karma: {
        id: input.karma?.id ?? input.id,
        reason: "karma",
        created_at: input.karma?.created_at
          ? toISOStringSafe(input.karma.created_at)
          : toISOStringSafe(input.created_at),
        updated_at: input.karma?.updated_at
          ? toISOStringSafe(input.karma.updated_at)
          : toISOStringSafe(input.updated_at),
        deleted_at: null,
        expires_at: null,
        community: {
          id: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
          name: "system",
          description: "System karma aggregation",
          subscriber_count: 0,
          created_at: toISOStringSafe(input.created_at),
          owner: memberSummary,
        },
        bannedUser: memberSummary,
        issuer: memberSummary,
      } satisfies IRedditCloneUserKarma,
    };
  }
}
