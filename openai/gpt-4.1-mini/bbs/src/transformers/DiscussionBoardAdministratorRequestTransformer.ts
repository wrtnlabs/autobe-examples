import { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardRegisteredUserAtSummaryTransformer } from "./DiscussionBoardRegisteredUserAtSummaryTransformer";

export namespace DiscussionBoardAdministratorRequestTransformer {
  export type Payload =
    Prisma.discussion_board_administrator_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        registered_user_id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        registeredUser:
          DiscussionBoardRegisteredUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_administrator_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorRequest> {
    return {
      id: input.id,
      registeredUser:
        await DiscussionBoardRegisteredUserAtSummaryTransformer.transform(
          input.registeredUser,
        ),
      registered_user_id: input.registered_user_id,
      reason: input.reason,
      status: input.status as "pending" | "approved" | "rejected",
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
