import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityMemberEmailVerificationAtSummaryTransformer {
  export type Payload =
    Prisma.reddit_community_member_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reddit_community_member_id: true,
        member: RedditCommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_member_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityMemberEmailVerification.ISummary> {
    return {
      id: input.id,
      token: input.token,
      expires_at: input.expires_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      reddit_community_member_id: input.reddit_community_member_id,
      member: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
    } satisfies IRedditCommunityMemberEmailVerification.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityMemberEmailVerificationAtSummaryTransformer {
//       export type Payload = Prisma.reddit_community_member_email_verificationsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             expires_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: RedditCommunityMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_community_member_email_verificationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityMemberEmailVerification.ISummary> {
//         return {
//   id: {string},
//   token: {string},
//   expires_at: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   reddit_community_member_id: {string},
//   member: await RedditCommunityMemberAtSummaryTransformer.transform(input.member),
//         };
//       }
//     }
//--------------------------------------------------------------