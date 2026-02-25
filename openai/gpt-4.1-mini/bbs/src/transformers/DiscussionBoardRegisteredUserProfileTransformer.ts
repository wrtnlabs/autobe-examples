import { IDiscussionBoardRegisteredUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardRegisteredUserProfileTransformer {
  export type Payload = Prisma.discussion_board_registered_usersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        bio: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        auditLogs: true,
        articles: true,
        comments: true,
        administratorRequests: true,
        userBans: true,
      },
    } satisfies Prisma.discussion_board_registered_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardRegisteredUserProfile> {
    return {
      displayName: input.display_name,
      bio: input.bio === null ? null : undefined,
    };
  }
}
