import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTrackerOrganizationAtSummaryTransformer {
  export type Payload = Prisma.hrm_tracker_organizationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        logo_image_uri: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        ownedOrganization: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.hrm_tracker_organizationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerOrganization.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      logo_image_uri: input.logo_image_uri ?? null,
      status: typia.assert<"active" | "archived" | "deleted">(input.status),
      created_at: input.created_at.toISOString(),
    };
  }
}
