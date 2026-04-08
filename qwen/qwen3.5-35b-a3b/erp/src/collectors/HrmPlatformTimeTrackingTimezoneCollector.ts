import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimeTrackingTimezone } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeTrackingTimezone";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformTimeTrackingTimezoneCollector {
  export async function collect(props: {
    body: IHrmPlatformTimeTrackingTimezone.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      timezone: props.body.timezone,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.body.organization_id } },
    } satisfies Prisma.hrm_platform_time_tracking_timezonesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformTimeTrackingTimezoneCollector {
//         export async function collect(props: {
//           body: IHrmPlatformTimeTrackingTimezone.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       timezone: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       organization: ...,
//           } satisfies Prisma.hrm_platform_time_tracking_timezonesCreateInput;
//         }
//       }
//--------------------------------------------------------------