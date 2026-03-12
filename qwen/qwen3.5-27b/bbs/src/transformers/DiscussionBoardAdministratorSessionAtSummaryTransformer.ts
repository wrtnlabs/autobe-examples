import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorSession";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdministratorAtSummaryTransformer } from "./DiscussionBoardAdministratorAtSummaryTransformer";

export namespace DiscussionBoardAdministratorSessionAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_administrator_sessionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        administrator:
          DiscussionBoardAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_administrator_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorSession.ISummary> {
    return {
      id: input.id,
      actor_type: "administrator",
      ip: input.ip,
      href: input.href,
      referrer: input.referrer ?? undefined,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      actor: await DiscussionBoardAdministratorAtSummaryTransformer.transform(
        input.administrator,
      ),
    };
  }
}
