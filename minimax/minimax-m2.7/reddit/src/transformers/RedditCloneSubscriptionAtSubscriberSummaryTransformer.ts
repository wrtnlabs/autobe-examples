import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneFileTransformer } from "./RedditCloneFileTransformer";

export namespace RedditCloneSubscriptionAtSubscriberSummaryTransformer {
  export type Payload = Prisma.reddit_clone_subscriptionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        community: true,
        member: {
          select: {
            username: true,
            profile: {
              select: {
                display_name: true,
                avatarFileAssociation: {
                  select: {
                    file: RedditCloneFileTransformer.select(),
                  },
                },
              },
            },
            karma: {
              select: {
                karma_score: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.reddit_clone_subscriptionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneSubscription.ISubscriberSummary> {
    const avatarFile = input.member?.profile?.avatarFileAssociation?.file;
    return {
      id: input.id,
      createdAt: toISOStringSafe(input.created_at),
      username: input.member.username,
      displayName: input.member.profile?.display_name ?? null,
      avatar: avatarFile
        ? await RedditCloneFileTransformer.transform(avatarFile)
        : undefined,
      karmaScore: input.member.karma?.karma_score ?? 0,
    } satisfies IRedditCloneSubscription.ISubscriberSummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneSubscriptionAtSubscriberSummaryTransformer {
//       export type Payload = Prisma.reddit_clone_subscriptionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             createdAt: true,
//             username: true,
//             displayName: true,
//             karmaScore: true,
//             ...
//           },
//         } satisfies Prisma.reddit_clone_subscriptionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneSubscription.ISubscriberSummary> {
//         return {
//   id: {string},
//   createdAt: {string},
//   username: {string},
//   displayName: {string | null},
//   avatar: {IRedditCloneFile | null},
//   karmaScore: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------