import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityAdminTransformer {
  export type Payload = Prisma.reddit_community_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        adminSessions: true,
        passwordResets: true,
        reportResolutions: true,
      },
    } satisfies Prisma.reddit_community_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityAdmin> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name ?? undefined,
      is_active: input.is_active,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditCommunityAdmin;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityAdminTransformer {
//       export type Payload = Prisma.reddit_community_adminsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             display_name: true,
//             is_active: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.reddit_community_adminsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityAdmin> {
//         return {
//   id: {string},
//   email: {string},
//   display_name: {string | null},
//   is_active: {boolean},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------