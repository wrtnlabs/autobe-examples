import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTrackerOrganizationTransformer {
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
      },
    } satisfies Prisma.hrm_tracker_organizationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerOrganization> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      logo_image_uri: input.logo_image_uri ?? undefined,
      currency: input.currency,
      timezone: input.timezone,
      fiscal_start_month: input.fiscal_start_month,
      status: input.status,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at
        ? toISOStringSafe(input.deleted_at)
        : undefined,
    };
  }
}
