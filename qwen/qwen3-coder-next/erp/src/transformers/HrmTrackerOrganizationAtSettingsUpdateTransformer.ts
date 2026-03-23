import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTrackerOrganizationAtSettingsUpdateTransformer {
  // 1. Payload type first
  export type Payload = Prisma.hrm_tracker_organizationsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        name: true,
        description: true,
        logo_image_uri: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        id: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        ownedOrganization: {
          select: {
            id: true,
          },
        },
        systemConfigs: {
          select: {
            id: true,
          },
        },
        pendingInvitations: {
          select: {
            id: true,
          },
        },
        employees: {
          select: {
            id: true,
          },
        },
        roles: {
          select: {
            id: true,
          },
        },
        departments: {
          select: {
            id: true,
          },
        },
        employeeHistories: {
          select: {
            id: true,
          },
        },
        projects: {
          select: {
            id: true,
          },
        },
        taskHistories: {
          select: {
            id: true,
          },
        },
        timelogs: {
          select: {
            id: true,
          },
        },
        timesheets: {
          select: {
            id: true,
          },
        },
        employeeContracts: {
          select: {
            id: true,
          },
        },
        timers: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.hrm_tracker_organizationsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerOrganization.ISettingsUpdate> {
    return {
      name: input.name,
      description: input.description ?? null,
      logo_image_uri: input.logo_image_uri ?? null,
      currency: input.currency,
      timezone: input.timezone,
      fiscal_start_month: input.fiscal_start_month,
    };
  }
}
