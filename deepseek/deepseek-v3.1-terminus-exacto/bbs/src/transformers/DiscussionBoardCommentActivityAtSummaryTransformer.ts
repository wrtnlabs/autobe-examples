import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentActivity";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardCommentAtSummaryTransformer } from "./DiscussionBoardCommentAtSummaryTransformer";

export namespace DiscussionBoardCommentActivityAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_comment_activitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        created_at: true,
        updated_at: true,
        comment: DiscussionBoardCommentAtSummaryTransformer.select(),
        metadata: {
          select: { id: true },
        } satisfies Prisma.discussion_board_comment_activity_metadataFindManyArgs,
        memberActivityLink: {
          select: { id: true },
        } satisfies Prisma.discussion_board_comment_activity_by_membersFindManyArgs,
        adminSubtype: {
          select: { id: true },
        } satisfies Prisma.discussion_board_comment_activity_by_adminsFindManyArgs,
        superAdminActor: {
          select: { id: true },
        } satisfies Prisma.discussion_board_comment_activity_by_super_adminsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_comment_activitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentActivity.ISummary> {
    return {
      id: input.id,
      action: input.action,
      comment: await DiscussionBoardCommentAtSummaryTransformer.transform(
        input.comment,
      ),
      created_at: input.created_at.toISOString(),
    };
  }
}
