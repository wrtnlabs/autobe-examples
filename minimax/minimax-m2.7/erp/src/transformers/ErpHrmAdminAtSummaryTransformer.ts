import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmAdminAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        display_name: true,
        avatar_uri: true,
        phone: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.erp_hrm_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmAdmin.ISummary> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name,
      avatar_uri: input.avatar_uri,
      phone: input.phone,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
