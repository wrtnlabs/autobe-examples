import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { IRedditCommunityAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityAdminAtSummaryTransformer } from "./RedditCommunityAdminAtSummaryTransformer";

export namespace RedditCommunityAdminPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_admin_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        admin: RedditCommunityAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_admin_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityAdminPasswordReset.ISummary> {
    return {
      id: input.id,
      email: input.email,
      expiresAt: input.expires_at.toISOString(),
      usedAt: input.used_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      admin: await RedditCommunityAdminAtSummaryTransformer.transform(
        input.admin,
      ),
    } satisfies IRedditCommunityAdminPasswordReset.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityAdminPasswordResetAtSummaryTransformer {
//       export type Payload = Prisma.reddit_community_admin_password_resetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             email: true,
//             expires_at: true,
//             used_at: true,
//             created_at: true,
//             updated_at: true,
//             admin: RedditCommunityAdminAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_community_admin_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityAdminPasswordReset.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   expiresAt: {string},
//   usedAt: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   admin: await RedditCommunityAdminAtSummaryTransformer.transform(input.admin),
//         };
//       }
//     }
//--------------------------------------------------------------