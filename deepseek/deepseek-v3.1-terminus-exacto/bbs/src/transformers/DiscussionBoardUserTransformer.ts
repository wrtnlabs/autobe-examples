import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardUserTransformer {
  export type Payload = Prisma.discussion_board_usersGetPayload<
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
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: false,
        passwordResets: false,
        emailVerifications: false,
        auditLogs: false,
        auditActions: false,
        systemActivities: false,
        apiRateLimits: false,
        securityEvents: false,
        sectionPreferences: false,
        articles: false,
        articleFavorites: false,
        comments: false,
        commentSnapshots: false,
        commentReports: false,
        commentVotes: false,
        commentMentions: false,
        commentFlags: false,
        commentRateLimits: false,
        commentEditHistories: false,
        administratorPromotionRequests: false,
        administratorAssignment: false,
        bans: false,
        moderationLogs: false,
        banAppeals: false,
        contentFlags: false,
      },
    } satisfies Prisma.discussion_board_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardUser> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name,
      bio: input.bio ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
