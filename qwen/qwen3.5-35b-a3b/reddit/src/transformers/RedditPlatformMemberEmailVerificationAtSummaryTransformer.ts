import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformMemberEmailVerificationAtSummaryTransformer {
  export type Payload =
    Prisma.reddit_platform_member_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        token: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: RedditPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_member_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformMemberEmailVerification.ISummary> {
    return {
      id: input.id,
      email: input.email,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      expires_at: input.expires_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      member: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
    } satisfies IRedditPlatformMemberEmailVerification.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformMemberEmailVerificationAtSummaryTransformer {
//       export type Payload = Prisma.reddit_platform_member_email_verificationsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             token: true,
//             expires_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: RedditPlatformMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_platform_member_email_verificationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformMemberEmailVerification.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   created_at: {string},
//   updated_at: {string},
//   expires_at: {string},
//   deleted_at: {string | null},
//   member: await RedditPlatformMemberAtSummaryTransformer.transform(input.member),
//         };
//       }
//     }
//--------------------------------------------------------------