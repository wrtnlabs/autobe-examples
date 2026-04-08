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

export namespace RedditCommunityAdminPasswordResetTransformer {
  export type Payload = Prisma.reddit_community_admin_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        email: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        reddit_community_admin_id: true,
        admin: RedditCommunityAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_admin_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityAdminPasswordReset> {
    const isExpired =
      input.used_at !== null || new Date(input.expires_at) < new Date();
    return {
      id: input.id,
      token: input.token,
      email: input.email,
      expires_at: toISOStringSafe(input.expires_at),
      used_at: input.used_at ? toISOStringSafe(input.used_at) : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      reddit_community_admin_id: input.reddit_community_admin_id,
      admin: await RedditCommunityAdminAtSummaryTransformer.transform(
        input.admin,
      ),
      is_expired: isExpired,
    } satisfies IRedditCommunityAdminPasswordReset;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityAdminPasswordResetTransformer {
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
//       export async function transform(input: Payload): Promise<IRedditCommunityAdminPasswordReset> {
//         return {
//   id: {string},
//   token: {string},
//   email: {string},
//   expires_at: {string},
//   used_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   reddit_community_admin_id: {string},
//   admin: await RedditCommunityAdminAtSummaryTransformer.transform(input.admin),
//   is_expired: {boolean},
//         };
//       }
//     }
//--------------------------------------------------------------