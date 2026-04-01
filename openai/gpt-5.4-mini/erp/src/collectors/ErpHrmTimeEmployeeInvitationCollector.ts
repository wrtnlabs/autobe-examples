import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeEmployeeInvitationCollector {
  export async function collect(props: {
    body: IErpHrmTimeEmployeeInvitation.ICreate;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      email: props.body.email,
      password_hash: "",
      display_name: "",
      avatar_image_url: null,
      phone_number: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    } satisfies Prisma.erp_hrm_time_membersCreateInput;
  }
}
