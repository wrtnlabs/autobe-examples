import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityHubMemberAtSummaryTransformer } from "./CommunityHubMemberAtSummaryTransformer";

export namespace CommunityHubMemberEmailVerificationAtSummaryTransformer {
  export type Payload =
    Prisma.community_hub_member_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        created_at: true,
        expired_at: true,
        member: CommunityHubMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_hub_member_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityHubMemberEmailVerification.ISummary> {
    return {
      id: input.id,
      token: input.token,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      member: await CommunityHubMemberAtSummaryTransformer.transform(
        input.member,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubMemberEmailVerificationAtSummaryTransformer {
//       export type Payload = Prisma.community_hub_member_email_verificationsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             created_at: true,
//             expired_at: true,
//             member: CommunityHubMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.community_hub_member_email_verificationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityHubMemberEmailVerification.ISummary> {
//         return {
//   id: {string},
//   token: {string},
//   created_at: {string},
//   expired_at: {string},
//   member: await CommunityHubMemberAtSummaryTransformer.transform(input.member),
//         };
//       }
//     }
//--------------------------------------------------------------