import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneFileAssociationAtSummaryTransformer } from "./RedditCloneFileAssociationAtSummaryTransformer";

export namespace RedditCloneMemberTransformer {
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
        sessions: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_member_sessionsFindManyArgs,
        passwordResets: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_member_password_resetsFindManyArgs,
        emailVerifications: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_member_email_verificationsFindManyArgs,
        profile: {
          select: {
            display_name: true,
            bio: true,
            avatarFileAssociation:
              RedditCloneFileAssociationAtSummaryTransformer.select(),
          } satisfies Prisma.reddit_clone_user_profilesSelect,
        },
        karma: {
          select: {
            karma_score: true,
          } satisfies Prisma.reddit_clone_user_karmasSelect,
        },
        ownedCommunities: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_communitiesFindManyArgs,
        communityModerations: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_community_moderatorsFindManyArgs,
        assignedCommunityModerators: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_community_moderatorsFindManyArgs,
        communityBans: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_community_bansFindManyArgs,
        submittedReports: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_community_reportsFindManyArgs,
        resolvedReports: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_community_reportsFindManyArgs,
        subscriptions: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_subscriptionsFindManyArgs,
        posts: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_postsFindManyArgs,
        comments: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_commentsFindManyArgs,
        postVotes: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_post_votesFindManyArgs,
        moderatorRoles: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_moderatorsFindManyArgs,
        assignedModerators: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_moderatorsFindManyArgs,
        moderatorSnapshots: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_moderator_snapshotsFindManyArgs,
        assignedModeratorSnapshots: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_moderator_snapshotsFindManyArgs,
        bansReceiveds: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_bansFindManyArgs,
        bansIssueds: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_bansFindManyArgs,
        reports: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_reportsFindManyArgs,
        uploadedFiles: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_filesFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditCloneMember> {
    return {
      id: input.id,
      username: input.username,
      displayName: input.profile?.display_name ?? input.username,
      bio: input.profile?.bio ?? undefined,
      avatar: input.profile?.avatarFileAssociation
        ? await RedditCloneFileAssociationAtSummaryTransformer.transform(
            input.profile.avatarFileAssociation,
          )
        : undefined,
      karmaScore: input.karma?.karma_score ?? 0,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IRedditCloneMember;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneMemberTransformer {
//       export type Payload = Prisma.reddit_clone_membersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             username: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.reddit_clone_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneMember> {
//         return {
//   id: {string},
//   username: {string},
//   displayName: {string},
//   bio: {string | null},
//   avatar: {IRedditCloneFileAssociation.ISummary | null},
//   karmaScore: {integer},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------