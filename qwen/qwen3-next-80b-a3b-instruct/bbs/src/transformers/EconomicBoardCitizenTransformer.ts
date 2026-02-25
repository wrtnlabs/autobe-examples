import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicBoardCitizenTransformer {
  export type Payload = Prisma.economic_board_citizensGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        display_name: true,
        bio: true,
        is_banned: true,
        ban_reason: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            articles: true,
            comments: true,
          },
        },
      },
    } satisfies Prisma.economic_board_citizensFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicBoardCitizen> {
    return {
      id: input.id,
      email: input.is_banned ? undefined : input.email,
      display_name: input.display_name ?? undefined,
      bio: input.bio ?? undefined,
      is_banned: input.is_banned,
      ban_reason: input.is_banned ? input.ban_reason : undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      article_count: input._count.articles,
      comment_count: input._count.comments,
    };
  }
}
