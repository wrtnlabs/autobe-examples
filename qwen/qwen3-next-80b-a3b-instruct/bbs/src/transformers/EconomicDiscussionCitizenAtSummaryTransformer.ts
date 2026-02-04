import { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicDiscussionCitizenAtSummaryTransformer {
  export type Payload = Prisma.economic_discussion_citizensGetPayload<
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
      },
    } satisfies Prisma.economic_discussion_citizensFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicDiscussionCitizen.ISummary> {
    return {
      id: input.id,
    };
  }
}
