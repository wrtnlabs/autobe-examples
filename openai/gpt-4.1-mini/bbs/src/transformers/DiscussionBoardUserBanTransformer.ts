import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdministratorAtSummaryTransformer } from "./DiscussionBoardAdministratorAtSummaryTransformer";
import { DiscussionBoardRegisteredUserAtSummaryTransformer } from "./DiscussionBoardRegisteredUserAtSummaryTransformer";

export namespace DiscussionBoardUserBanTransformer {
  export type Payload = Prisma.discussion_board_user_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        banned_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        registeredUser:
          DiscussionBoardRegisteredUserAtSummaryTransformer.select(),
        administrator:
          DiscussionBoardAdministratorAtSummaryTransformer.select(),
        userUnbans: true,
      },
    } satisfies Prisma.discussion_board_user_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardUserBan> {
    return {
      id: input.id,
      reason: input.reason,
      bannedAt: input.banned_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      registeredUserId: input.registeredUser.id,
      administratorId: input.administrator?.id ?? null,
      registeredUser:
        await DiscussionBoardRegisteredUserAtSummaryTransformer.transform(
          input.registeredUser,
        ),
      administrator: input.administrator
        ? await DiscussionBoardAdministratorAtSummaryTransformer.transform(
            input.administrator,
          )
        : null,
    };
  }
}
