import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmGuestTransformer {
  export type Payload = Prisma.erp_hrm_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
      },
    } satisfies Prisma.erp_hrm_guestsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmGuest> {
    return {
      id: input.id,
    };
  }
}
