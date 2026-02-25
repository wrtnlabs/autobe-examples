import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicBoardCitizenAtSummaryTransformer {
  export type Payload = Prisma.economic_board_citizensGetPayload<
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
        ban_reason: true,
        created_at: true,
        updated_at: true,
        citizenSessions: true,
        passwordResets: true,
        emailVerifications: true,
        auditTargets: true,
        articles: true,
        comments: true,
        articleViews: true,
      },
    } satisfies Prisma.economic_board_citizensFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicBoardCitizen.ISummary> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name ?? undefined,
      ban_reason: input.ban_reason ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
