import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeOrganizationCollector {
  export async function collect(props: {
    body: IErpHrmTimeOrganization.ICreate;
    member: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      logo_image_url: props.body.logoImageUrl ?? null,
      status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      ownerMember: { connect: { id: props.member.id } },
    } satisfies Prisma.erp_hrm_time_organizationsCreateInput;
  }
}
