import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLog";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingEmployeeTransformer } from "./HrmTimeTrackingEmployeeTransformer";
import { HrmTimeTrackingManagerTransformer } from "./HrmTimeTrackingManagerTransformer";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";
import { HrmTimeTrackingOwnerTransformer } from "./HrmTimeTrackingOwnerTransformer";

export namespace HrmTimeTrackingActivityLogTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingActivityLog> {
    const actor =
      input.actor_type === "owner"
        ? input.ownerActorLink
          ? await HrmTimeTrackingOwnerTransformer.transform(
              input.ownerActorLink.owner,
            )
          : (() => {
              throw new Error(
                "Missing owner actor link for activity log actor_type=owner",
              );
            })()
        : input.actor_type === "manager"
          ? input.managerActorLink
            ? await HrmTimeTrackingManagerTransformer.transform(
                input.managerActorLink.manager,
              )
            : (() => {
                throw new Error(
                  "Missing manager actor link for activity log actor_type=manager",
                );
              })()
          : input.actor_type === "employee"
            ? input.employeeActor
              ? await HrmTimeTrackingEmployeeTransformer.transform(
                  input.employeeActor.employee,
                )
              : (() => {
                  throw new Error(
                    "Missing employee actor link for activity log actor_type=employee",
                  );
                })()
            : (() => {
                throw new Error(
                  `Unsupported activity log actor_type: ${input.actor_type}`,
                );
              })();
    return {
      id: input.id,
      organization:
        await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      actor_type: input.actor_type,
      actor,
      action_type: input.action_type,
      target_entity: input.target_entity,
      target_entity_id: input.target_entity_id ?? null,
      details: input.details ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
        actor_type: true,
        ownerActorLink: {
          select: {
            owner: HrmTimeTrackingOwnerTransformer.select(),
          },
        },
        managerActorLink: {
          select: {
            manager: HrmTimeTrackingManagerTransformer.select(),
          },
        },
        employeeActor: {
          select: {
            employee: HrmTimeTrackingEmployeeTransformer.select(),
          },
        },
        action_type: true,
        target_entity: true,
        target_entity_id: true,
        details: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_activity_logsFindManyArgs;
  }
  export type Payload = Prisma.hrm_time_tracking_activity_logsGetPayload<
    ReturnType<typeof select>
  >;
}
