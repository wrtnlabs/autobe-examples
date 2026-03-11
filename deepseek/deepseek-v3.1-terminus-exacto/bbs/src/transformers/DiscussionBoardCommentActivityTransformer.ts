import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentActivity";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardCommentAtSummaryTransformer } from "./DiscussionBoardCommentAtSummaryTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "./DiscussionBoardSuperAdminAtSummaryTransformer";

export namespace DiscussionBoardCommentActivityTransformer {
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
        metadata: true,
        memberActivityLink: {
          select: {
            member: DiscussionBoardMemberAtSummaryTransformer.select(),
          },
        } satisfies Prisma.discussion_board_comment_activity_by_membersFindManyArgs,
        adminSubtype: {
          select: {
            admin: DiscussionBoardAdminAtSummaryTransformer.select(),
          },
        } satisfies Prisma.discussion_board_comment_activity_by_adminsFindManyArgs,
        superAdminActor: {
          select: {
            superAdmin: DiscussionBoardSuperAdminAtSummaryTransformer.select(),
          },
        } satisfies Prisma.discussion_board_comment_activity_by_super_adminsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_comment_activitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentActivity> {
    return {
      id: input.id,
      action: input.action,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      comment: await DiscussionBoardCommentAtSummaryTransformer.transform(
        input.comment,
      ),
      actor: await resolveActor(input),
    };
  }
  async function resolveActor(
    input: Payload,
  ): Promise<IDiscussionBoardCommentActivity["actor"]> {
    if (input.memberActivityLink?.member) {
      return await DiscussionBoardMemberAtSummaryTransformer.transform(
        input.memberActivityLink.member,
      );
    }
    if (input.adminSubtype?.admin) {
      return await DiscussionBoardAdminAtSummaryTransformer.transform(
        input.adminSubtype.admin,
      );
    }
    if (input.superAdminActor?.superAdmin) {
      return await DiscussionBoardSuperAdminAtSummaryTransformer.transform(
        input.superAdminActor.superAdmin,
      );
    }
    throw new Error("No actor subtype found for comment activity");
  }
}
