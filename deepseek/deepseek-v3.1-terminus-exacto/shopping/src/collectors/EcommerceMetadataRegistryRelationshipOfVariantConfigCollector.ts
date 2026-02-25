import { IEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationshipOfVariantConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMetadataRegistryRelationshipOfVariantConfigCollector {
  export async function collect(props: {
    body: IEcommerceMetadataRegistryRelationshipOfVariantConfig.ICreate;
    ecommerceAdministrators: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      user_type: props.body.user_type,
      ban_reason: props.body.ban_reason,
      ban_duration_days: props.body.ban_duration_days ?? null,
      banned_at: new Date(),
      lifted_at: null,
      appeal_status: props.body.appeal_status,
      appeal_reason: props.body.appeal_reason ?? null,
      appeal_reviewed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // Relationships
      administrator: { connect: { id: props.ecommerceAdministrators.id } },
      appealReviewer: undefined,
    } satisfies Prisma.ecommerce_admin_user_bansCreateInput;
  }
}
